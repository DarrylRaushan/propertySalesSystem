import * as dbFeature from "./db-feature";
import { type PropertyViewing, type CustomerAccount, type Property } from "../drizzle/schema";
import { invokeLLM, hasLLMConfigured } from "./_core/llm";

export interface IncomingWhatsAppPayload {
  from: string; // E.g. "+60128821099" or "whatsapp:+60128821099"
  body: string;
  senderName?: string;
  messageSid?: string;
  /** When set (e.g. from a live Baileys session), bypass phone lookup and use this account directly */
  customerAccountIdHint?: number;
}

export interface WhatsAppProcessingResult {
  success: boolean;
  action: "viewing_cancelled" | "viewing_rescheduled" | "viewing_booked" | "status_query" | "calendar_invite" | "general_chat" | "unknown";
  replyMessage: string;
  viewing?: PropertyViewing;
  customer?: CustomerAccount;
  details?: Record<string, any>;
}

// ==================== RESCHEDULE CONVERSATION STATE ====================
// In-memory state machine for multi-step reschedule flow.
// Key: normalized phone number → current pending reschedule session.
interface RescheduleSession {
  step: "awaiting_id" | "awaiting_date" | "awaiting_time";
  viewingId?: number;
  newDate?: string;
  expiresAt: number; // unix ms - sessions expire after 5 minutes
}

const rescheduleSessionMap = new Map<string, RescheduleSession>();

function normalizeKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function sessionFor(phone: string): RescheduleSession | undefined {
  const key = normalizeKey(phone);
  const session = rescheduleSessionMap.get(key);
  if (session && Date.now() > session.expiresAt) {
    rescheduleSessionMap.delete(key);
    return undefined;
  }
  return session;
}

function setSession(phone: string, session: RescheduleSession) {
  rescheduleSessionMap.set(normalizeKey(phone), session);
}

function clearSession(phone: string) {
  rescheduleSessionMap.delete(normalizeKey(phone));
}

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ==================== BOOK CONVERSATION STATE ====================
// In-memory state machine for multi-step WhatsApp booking flow.
// Key: normalized phone number → current pending book session.
interface BookSession {
  step: "awaiting_property" | "awaiting_date" | "awaiting_time";
  /** Ordered shortlist snapshot used to resolve BOOK [n] references */
  shortlistProperties?: {
    id: number;
    title: string;
    location: string;
    price: number;
    beds: number;
    propertyImage: string | null;
  }[];
  propertyId?: number;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyPrice?: number;
  propertyBeds?: number;
  propertyImage?: string | null;
  newDate?: string;
  expiresAt: number; // unix ms — sessions expire after 10 minutes
}

const bookSessionMap = new Map<string, BookSession>();
const BOOK_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function bookSessionFor(phone: string): BookSession | undefined {
  const key = normalizeKey(phone);
  const session = bookSessionMap.get(key);
  if (session && Date.now() > session.expiresAt) {
    bookSessionMap.delete(key);
    return undefined;
  }
  return session;
}

function setBookSession(phone: string, session: BookSession) {
  bookSessionMap.set(normalizeKey(phone), session);
}

function clearBookSession(phone: string) {
  bookSessionMap.delete(normalizeKey(phone));
}

/**
 * Helper to generate a clean, RFC 5545 compliant .ics iCalendar file content
 * for VIP Private Property Tours.
 */
export function generateViewingIcs(
  viewing: {
    id: number;
    propertyTitle: string;
    propertyLocation: string;
    propertyPrice?: number;
    agentName: string;
    agentPhone: string;
    date: string;
    timeSlot: string;
    notes?: string | null;
  },
  customerName: string = "VIP Client",
  customerEmail: string = "client@properly.my"
): string {
  // Parse date into YYYY, MM, DD
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1; // 1-12
  let day = new Date().getDate();

  const monthNames: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  const isoMatch = viewing.date.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  const wordsMatch = viewing.date.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  const slashMatch = viewing.date.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else if (wordsMatch) {
    day = parseInt(wordsMatch[1], 10);
    const mStr = wordsMatch[2].toLowerCase();
    month = monthNames[mStr.slice(0, 3)] || month;
    if (wordsMatch[3]) year = parseInt(wordsMatch[3], 10);
  } else if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10);
    year = parseInt(slashMatch[3], 10);
  }

  // Parse timeSlot: e.g. "11:00 AM - 12:00 PM" or "02:30 PM - 03:30 PM" or "2:00 PM"
  let startHour = 11;
  let startMinute = 0;
  let endHour = 12;
  let endMinute = 0;

  const timeMatches = viewing.timeSlot.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);
  if (timeMatches && timeMatches.length > 0) {
    const parseTimeComponent = (str: string) => {
      const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return { hour: 11, minute: 0 };
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const meridiem = m[3] ? m[3].toLowerCase() : (h >= 8 && h <= 11 ? "am" : "pm");
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      return { hour: h, minute: min };
    };

    const s = parseTimeComponent(timeMatches[0]);
    startHour = s.hour;
    startMinute = s.minute;

    if (timeMatches.length > 1) {
      const e = parseTimeComponent(timeMatches[1]);
      endHour = e.hour;
      endMinute = e.minute;
    } else {
      endHour = (startHour + 1) % 24;
      endMinute = startMinute;
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMinute)}00`;
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const descriptionLines = [
    `🏛️ PROPERLY LUXURY REAL ESTATE — VIP PRIVATE TOUR`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Residence: ${viewing.propertyTitle}`,
    `Location: ${viewing.propertyLocation}`,
    viewing.propertyPrice ? `Price: RM ${viewing.propertyPrice.toLocaleString()}` : "",
    `Dedicated Specialist: ${viewing.agentName} (${viewing.agentPhone})`,
    viewing.notes ? `Special Requests: ${viewing.notes}` : "",
    `Booking Reference: #${viewing.id}`,
    ``,
    `Need to reschedule or cancel?`,
    `Reply directly via WhatsApp Concierge:`,
    `• CANCEL #${viewing.id}`,
    `• RESCHEDULE #${viewing.id}`,
  ].filter(Boolean).join("\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Properly Luxury Real Estate//Property Tour Concierge//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kuala_Lumpur",
    "X-LIC-LOCATION:Asia/Kuala_Lumpur",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:MYT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:properly-viewing-${viewing.id}@properly.my`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART;TZID=Asia/Kuala_Lumpur:${dtStart}`,
    `DTEND;TZID=Asia/Kuala_Lumpur:${dtEnd}`,
    `SUMMARY:🏛️ VIP Private Tour: ${viewing.propertyTitle}`,
    `DESCRIPTION:${descriptionLines}`,
    `LOCATION:${viewing.propertyLocation}`,
    `ORGANIZER;CN=Properly Luxury Real Estate:mailto:concierge@properly.my`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${customerName.replace(/[,;]/g, "")}:mailto:${customerEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: VIP Private Tour of ${viewing.propertyTitle} in 1 hour`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
}

/**
 * Helper to generate smart dynamic quick slots for reschedule
 */
export function getSmartRescheduleSlots(referenceDate: Date = new Date()): { label: string; date: string; timeSlot: string }[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

  // Tomorrow
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Day after tomorrow (+2 days)
  const day2 = new Date(referenceDate);
  day2.setDate(day2.getDate() + 2);

  // Weekend (+3 days)
  const day3 = new Date(referenceDate);
  day3.setDate(day3.getDate() + 3);

  // Weekend (+4 days)
  const day4 = new Date(referenceDate);
  day4.setDate(day4.getDate() + 4);

  return [
    { label: `Tomorrow (${formatDate(tomorrow)}) at 11:00 AM`, date: formatDate(tomorrow), timeSlot: "11:00 AM - 12:00 PM" },
    { label: `Tomorrow (${formatDate(tomorrow)}) at 03:00 PM`, date: formatDate(tomorrow), timeSlot: "03:00 PM - 04:00 PM" },
    { label: `${formatDate(day3)} at 11:00 AM`, date: formatDate(day3), timeSlot: "11:00 AM - 12:00 PM" },
    { label: `${formatDate(day4)} at 02:30 PM`, date: formatDate(day4), timeSlot: "02:30 PM - 03:30 PM" },
  ];
}

/**
 * Format luxury VIP Private Viewing Booking Confirmation for WhatsApp
 */
export function formatViewingConfirmation(
  viewing: PropertyViewing,
  customerName: string
): string {
  return [
    `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*VIP Private Tour Confirmed* ✨`,
    ``,
    `Dear *${customerName}*,`,
    `Your private walkthrough has been confirmed with your dedicated specialist.`,
    ``,
    `*Residence:* ${viewing.propertyTitle}`,
    `*Location:* ${viewing.propertyLocation}`,
    `*Date:* ${viewing.date}`,
    `*Time Window:* ${viewing.timeSlot}`,
    `*Price:* RM ${viewing.propertyPrice.toLocaleString()}`,
    `*Specialist:* ${viewing.agentName} (${viewing.agentPhone})`,
    viewing.notes ? `*Special Requests:* "${viewing.notes}"` : ``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*1-Tap Quick Actions:*`,
    `1️⃣ Reply *1* or *CANCEL #${viewing.id}* — to cancel booking`,
    `2️⃣ Reply *2* or *RESCHEDULE #${viewing.id}* — to change date/time`,
    `3️⃣ Reply *3* or *AGENT* — to speak with your specialist`,
    `4️⃣ Reply *4* or *CALENDAR* — to receive *.ics* calendar invite`,
    ``,
    `📅 *Calendar Invite (.ics)* is attached below to add directly to your Apple / Google / Outlook Calendar.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format Viewing Cancellation Confirmation for WhatsApp
 */
export function formatCancellationConfirmation(
  viewing: PropertyViewing,
  customerName: string
): string {
  return [
    `❌ *TOUR CANCELLED: ${viewing.propertyTitle}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Dear *${customerName}*,`,
    `Your scheduled VIP private tour on *${viewing.date} (${viewing.timeSlot})* has been *successfully cancelled*.`,
    ``,
    `*Property:* ${viewing.propertyTitle}`,
    `*Assigned Specialist:* ${viewing.agentName}`,
    `*Status:* Slot released and database updated.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `To rebook anytime, reply *RESCHEDULE #${viewing.id}*, *BOOK*, or visit your VIP Customer Portal.`,
  ].join("\n");
}

/**
 * Helper to generate a 1-tap Google Calendar URL for VIP property tours
 */
export function generateGoogleCalendarUrl(
  viewing: {
    id: number;
    propertyTitle: string;
    propertyLocation?: string | null;
    agentName: string;
    date: string;
    timeSlot: string;
  }
): string {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  const isoMatch = viewing.date.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  let startHour = 11, startMinute = 0, endHour = 12, endMinute = 0;
  const timeMatches = viewing.timeSlot.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);
  if (timeMatches && timeMatches.length > 0) {
    const parseTimeComponent = (str: string) => {
      const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return { hour: 11, minute: 0 };
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const meridiem = m[3] ? m[3].toLowerCase() : (h >= 8 && h <= 11 ? "am" : "pm");
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      return { hour: h, minute: min };
    };
    const s = parseTimeComponent(timeMatches[0]);
    startHour = s.hour;
    startMinute = s.minute;
    if (timeMatches.length > 1) {
      const e = parseTimeComponent(timeMatches[1]);
      endHour = e.hour;
      endMinute = e.minute;
    } else {
      endHour = (startHour + 1) % 24;
      endMinute = startMinute;
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMinute)}00`;
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;

  const searchParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `VIP Tour: ${viewing.propertyTitle}`,
    dates: `${dtStart}/${dtEnd}`,
    details: `VIP Private Viewing of ${viewing.propertyTitle} with specialist ${viewing.agentName}. Booking Ref #${viewing.id}`,
    location: viewing.propertyLocation || "Kuala Lumpur, Malaysia",
  });

  return `https://calendar.google.com/calendar/render?${searchParams.toString()}`;
}

/**
 * Format Reschedule Confirmation for customer
 */
export function formatRescheduleConfirmation(
  viewing: PropertyViewing,
  customerName: string
): string {
  const gcalUrl = generateGoogleCalendarUrl(viewing);
  return [
    `📅 *TOUR RESCHEDULED: ${viewing.propertyTitle}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Dear *${customerName}*,`,
    `Your VIP private tour has been *successfully rescheduled*.`,
    ``,
    `*Residence:* ${viewing.propertyTitle}`,
    `*New Date:* ${viewing.date}`,
    `*New Time:* ${viewing.timeSlot}`,
    `*Specialist:* ${viewing.agentName} (${viewing.agentPhone})`,
    `*Booking Ref:* #${viewing.id}`,
    ``,
    `🗓️ *1-Tap Google Calendar:*`,
    `${gcalUrl}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Quick Actions:*`,
    `• Reply *1* or *CANCEL #${viewing.id}* — to cancel`,
    `• Reply *4* or *CALENDAR* — to get updated .ics calendar file`,
    `• Reply *AGENT* — to contact ${viewing.agentName}`,
    ``,
    `Your customer portal, specialist calendar, and email alerts have been updated automatically.`,
  ].join("\n");
}

/**
 * Format Agent Alert for reschedule
 */
export function formatAgentRescheduleAlert(
  viewing: PropertyViewing,
  customerName: string,
  customerPhone: string
): string {
  const gcalUrl = generateGoogleCalendarUrl(viewing);
  return [
    `*SPECIALIST ALERT: VIP Tour Rescheduled*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Client *${customerName}* (${customerPhone}) has rescheduled their private viewing via WhatsApp.`,
    ``,
    `*Residence:* ${viewing.propertyTitle}`,
    `*New Date:* ${viewing.date}`,
    `*New Time:* ${viewing.timeSlot}`,
    `*Booking Ref:* #${viewing.id}`,
    ``,
    `🗓️ *1-Tap Google Calendar:*`,
    `${gcalUrl}`,
    ``,
    `*System State:* Portal calendar and email alerts dispatched automatically.`,
  ].join("\n");
}

/**
 * Format Agent Alert for WhatsApp
 */
export function formatAgentCancellationAlert(
  viewing: PropertyViewing,
  customerName: string,
  customerPhone: string
): string {
  return [
    `*SPECIALIST ALERT: VIP Tour Cancelled*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Client *${customerName}* (${customerPhone}) has cancelled their private viewing via WhatsApp.`,
    ``,
    `*Residence:* ${viewing.propertyTitle}`,
    `*Scheduled Slot:* ${viewing.date} (${viewing.timeSlot})`,
    `*Booking Ref:* #${viewing.id}`,
    `*System State:* Calendar slot marked available.`,
  ].join("\n");
}

/**
 * Format Status Query Response
 */
export function formatStatusQuery(
  customer: { name: string; phone?: string | null; email?: string } | CustomerAccount,
  viewings: PropertyViewing[]
): string {
  if (viewings.length === 0) {
    return [
      `*PROPERLY LUXURY REAL ESTATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${customer.name}*, you currently have no upcoming private tour bookings.`,
      ``,
      `To schedule a private walkthrough for any luxury penthouse or condominium, visit your VIP Customer Portal or reply with the residence name.`,
    ].join("\n");
  }

  if (viewings.length === 1) {
    const v = viewings[0];
    return [
      `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Your Scheduled VIP Private Tour*`,
      ``,
      `Dear *${customer.name}*, here is your confirmed appointment:`,
      ``,
      `*Residence:* ${v.propertyTitle}`,
      `*Location:* ${v.propertyLocation}`,
      `*Date:* ${v.date}`,
      `*Time Window:* ${v.timeSlot}`,
      `*Specialist:* ${v.agentName} (${v.agentPhone})`,
      `*Booking Ref:* #${v.id}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*1-Tap Quick Actions:*`,
      `1️⃣ Reply *1* or *CANCEL #${v.id}* — to cancel this booking`,
      `2️⃣ Reply *2* or *RESCHEDULE #${v.id}* — to change date/time`,
      `3️⃣ Reply *3* or *AGENT* — to speak with your specialist`,
      `4️⃣ Reply *4* or *CALENDAR* — to get *.ics* calendar invite`,
    ].join("\n");
  }

  const items = viewings.map(
    (v) =>
      `• *#${v.id} — ${v.propertyTitle}*\n  Date: ${v.date} (${v.timeSlot})\n  Specialist: ${v.agentName} (${v.agentPhone})`
  );

  return [
    `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Your Scheduled VIP Private Tours*`,
    ``,
    `Dear *${customer.name}*, you have *${viewings.length}* upcoming private appointments:`,
    ``,
    items.join("\n\n"),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Quick Actions:*`,
    `• Reply *CANCEL #[ID]* — to cancel a booking`,
    `• Reply *RESCHEDULE #[ID]* — to reschedule to a new date & time`,
    `• Reply *CALENDAR* — to export *.ics* calendar invites`,
    `• Reply *AGENT* — to speak with your specialist`,
  ].join("\n");
}

/**
 * Format Agent Contact Query Response
 */
export function formatAgentQuery(
  customerName: string,
  viewing?: PropertyViewing
): string {
  if (viewing) {
    return [
      `*PROPERLY LUXURY REAL ESTATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Dedicated Luxury Specialist Contact*`,
      ``,
      `Dear *${customerName}*, here is the direct contact for your assigned specialist:`,
      ``,
      `*Specialist:* ${viewing.agentName}`,
      `*Direct Phone:* ${viewing.agentPhone}`,
      `*Assigned Residence:* ${viewing.propertyTitle}`,
      `*Upcoming Tour:* ${viewing.date} (${viewing.timeSlot})`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `You may call or WhatsApp *${viewing.agentName}* directly at *${viewing.agentPhone}*, or reply here for concierge assistance.`,
    ].join("\n");
  }

  return [
    `*PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Dedicated Luxury Specialist Contact*`,
    ``,
    `Dear *${customerName}*, our senior luxury property specialists are on standby:`,
    ``,
    `*Senior Concierge Specialist:* Amir Rahman`,
    `*Direct Phone:* +60 17-291 8832`,
    `*Hours:* 8:00 AM – 10:00 PM Daily`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Reply *STATUS* to view your scheduled tours, or visit your Customer Portal to reserve a private viewing.`,
  ].join("\n");
}

/**
 * Format Shortlist Reply — lists a customer's saved properties with numbered BOOK prompts.
 * If empty, guides the customer to the portal to save properties first.
 */
export function formatShortlistReply(
  customer: CustomerAccount,
  props: Property[]
): string {
  if (props.length === 0) {
    return [
      `*PROPERLY LUXURY REAL ESTATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${customer.name}*, your shortlist is currently empty.`,
      ``,
      `To book a private tour:`,
      `1️⃣  Log in to your Customer Portal`,
      `2️⃣  Browse our exclusive luxury portfolio`,
      `3️⃣  Tap ❤️ to shortlist your favourite residences`,
      `4️⃣  Return here and reply *SHORTLIST* to view and book them`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Reply *STATUS* to view existing tours, or *AGENT* to speak with your specialist.`,
    ].join("\n");
  }

  const items = props.map((p, i) =>
    [
      `*${i + 1}. ${p.title}*`,
      `   📍 ${p.location} | RM ${p.price.toLocaleString()} | ${p.beds} bed`,
      `   👉 Reply *BOOK ${i + 1}* to schedule a private tour`,
    ].join("\n")
  );

  return [
    `*PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Your Shortlisted Residences*`,
    ``,
    `Dear *${customer.name}*, here are your saved properties:`,
    ``,
    items.join("\n\n"),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Reply *BOOK [number]* to schedule a private tour for that residence.`,
    `Example: *BOOK 1* to book the first property on the list.`,
  ].join("\n");
}

/**
 * Normalizes slang, abbreviations, Malaysian/Singaporean colloquialisms, and common typos.
 * Also extracts any explicit booking IDs (#5, booking 5) or list item numbers (book 1, 1st).
 */
export function normalizeWhatsAppText(text: string): {
  normalized: string;
  originalLower: string;
  extractedId: number | null;
  extractedItemNumber: number | null;
} {
  const lower = text.trim().toLowerCase();

  // Extract explicit ID if pattern like "#5", "booking 5", "id 5", "reschedule 5", "cancel 5"
  let extractedId: number | null = null;
  const hashIdMatch = text.match(/#(\d+)/);
  if (hashIdMatch) {
    extractedId = parseInt(hashIdMatch[1], 10);
  } else {
    const commandIdMatch = lower.match(
      /\b(?:booking|viewing|appointment|appt|id|slot|tour|reschedule|cancel|cncl)\s*#?(\d+)\b/i
    );
    if (commandIdMatch) {
      extractedId = parseInt(commandIdMatch[1], 10);
    }
  }

  // Extract item index (e.g. for BOOK 1, or choosing from shortlist: "1", "option 1", "unit 2", "first one", "1st")
  let extractedItemNumber: number | null = null;
  const itemMatch = lower.match(
    /\b(?:book|bk|choose|pick|option|number|no|unit|residence|res|item)?\s*#?(\d+)\b/i
  );
  if (itemMatch && itemMatch[1]) {
    extractedItemNumber = parseInt(itemMatch[1], 10);
  } else if (/\b(first|1st|pertama)\b/i.test(lower)) {
    extractedItemNumber = 1;
  } else if (/\b(second|2nd|kedua)\b/i.test(lower)) {
    extractedItemNumber = 2;
  } else if (/\b(third|3rd|ketiga)\b/i.test(lower)) {
    extractedItemNumber = 3;
  } else if (/\b(fourth|4th|keempat)\b/i.test(lower)) {
    extractedItemNumber = 4;
  }

  // Build normalized token stream
  let norm = " " + lower + " ";

  // Punctuation softening
  norm = norm.replace(/[!?.,;:\-_/\\]/g, " ");

  // Colloquial / Malay intent mappings
  norm = norm.replace(/\b(tak jadi|x jadi|tk jadi|xnk|tak mau|tak nak|batal|batalkan)\b/g, " cancel ");
  norm = norm.replace(/\b(tukar tarikh|tukar masa|tukar time|tukar hari|ubah tarikh|anjak|tangguh|pospon)\b/g, " reschedule ");
  norm = norm.replace(/\b(nak book|nak booking|nak tengok|nak tgk|nak lawat|nak melawat|nak jumpa)\b/g, " book viewing ");
  norm = norm.replace(/\b(ada booking|ada viewing|ada appointment|ada jadual|bila tour|pukul berapa|jam berapa)\b/g, " check status ");
  norm = norm.replace(/\b(siapa agent|sape agent|nak cakap agent|nak contact agent|nombor agent|no agent)\b/g, " agent contact ");

  // Common Slang & Abbreviations
  const replacements: [RegExp, string][] = [
    [/\b(cncl|cancle|cancell|canceld|cancled)\b/g, "cancel"],
    [/\b(resched|rsched|resch|resche|re-schedule|reshed|reshedul)\b/g, "reschedule"],
    [/\b(appt|appts|apptmnt|apptmts|apt|apts|apmt|apmts)\b/g, "appointment"],
    [/\b(sched|sked|skdule|schedu)\b/g, "schedule"],
    [/\b(shrtlist|short-list|shorlist|shorlisted|short-listed)\b/g, "shortlist"],
    [/\b(bk|bking)\b/g, "book"],
    [/\b(fav|favs|fave|faves|favourite|favourites|favorite|favorites)\b/g, "shortlist"],
    [/\b(wishlist|wshlist|saved|bookmarks)\b/g, "shortlist"],
    [/\b(prop|props)\b/g, "properties"],
    [/\b(tmrw|tmr|2mrw|2moro|tomorow|tommorow)\b/g, "tomorrow"],
    [/\b(wanna|wan to|wnt to)\b/g, "want to"],
    [/\b(pls|plz|pleas|plsss|plss)\b/g, "please"],
    [/\b(cant|can't|cannot|wont|won't)\s+(make it|attend|come|go|be there)\b/g, "cancel"],
    [/\b(not able to attend|unable to attend|not coming|drop out|drop my slot|drop appointment)\b/g, "cancel"],
    [/\b(not free|something came up|emergency cannot)\b/g, "cancel"],
    [/\b(change|shift|move|postpone|switch|tukar)\s+(my\s+)?(date|time|slot|day|appt|appointment|booking|viewing|tour)\b/g, "reschedule"],
    [/\b(another\s+(date|day|time|slot)|different\s+(date|day|time|slot))\b/g, "reschedule"],
    [/\b(human|person|someone|consultant|advisor|rep|representative|broker)\b/g, "agent"],
  ];

  for (const [pattern, rep] of replacements) {
    norm = norm.replace(pattern, ` ${rep} `);
  }

  // Remove filler particles: "la", "lah", "ah", "deh", "leh", "bro", "boss", "ya", "yo", "hai"
  norm = norm.replace(/\b(lah|la|leh|lor|meh|deh|ah|ar|bro|boss|bos|sir|yo|hai)\b/g, " ");

  norm = norm.replace(/\s+/g, " ").trim();

  return {
    normalized: norm,
    originalLower: lower,
    extractedId,
    extractedItemNumber,
  };
}

function formatStandardDate(d: Date): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function capitalizeWord(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Flexible date parser for natural language inputs like:
 * "tomorrow", "tmrw", "today", "25 Oct", "25 Oct 2026", "25/10/2026", "25-10-2026", "25th October 2026"
 */
export function parseFlexibleWhatsAppDate(input: string, referenceDate: Date = new Date()): string | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Relative dates: "today", "tomorrow", "tmrw", "esok", "hari ini"
  if (/^(today|hari ini)$/i.test(lower)) {
    return formatStandardDate(referenceDate);
  }
  if (/^(tomorrow|tmrw|tmr|esok|2mrw)$/i.test(lower)) {
    const nextDay = new Date(referenceDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return formatStandardDate(nextDay);
  }

  // 2. Standard format with year: "25 Oct 2026", "5 November 2026"
  const standardDateMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-\/]+([a-zA-Z]+)[\s\-\/]+(\d{4})$/);
  if (standardDateMatch) {
    const day = standardDateMatch[1].padStart(2, "0");
    const month = capitalizeWord(standardDateMatch[2].slice(0, 3));
    const year = standardDateMatch[3];
    return `${day} ${month} ${year}`;
  }

  // 3. Short format without year: "25 Oct", "5 Nov", "12 December"
  const monthNoYearMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-\/]+([a-zA-Z]+)$/);
  if (monthNoYearMatch) {
    const day = monthNoYearMatch[1].padStart(2, "0");
    const month = capitalizeWord(monthNoYearMatch[2].slice(0, 3));
    const year = referenceDate.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // 4. ISO or slash format: "2026-10-25" or "25/10/2026" or "25-10-2026"
  const isoMatch = trimmed.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = isoMatch[3].padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[monthIdx] || "Oct";
    return `${day} ${month} ${year}`;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const monthIdx = parseInt(slashMatch[2], 10) - 1;
    const year = slashMatch[3];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[monthIdx] || "Oct";
    return `${day} ${month} ${year}`;
  }

  // 5. Fallback regex test
  const looksLikeDate = /\d{1,2}[\s\-\/]\w+[\s\-\/]\d{2,4}|\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(trimmed);
  if (looksLikeDate) {
    return trimmed;
  }

  return null;
}

export interface IntentClassificationResult {
  intent: "CANCEL" | "RESCHEDULE" | "STATUS" | "SHORTLIST" | "BOOK" | "AGENT" | "UNKNOWN";
  id?: number | null;
  targetPropertyIndex?: number | null;
}

/**
 * Semantic intent classification using LLM for complex, colloquial, or ambiguous messages
 */
export async function classifyWhatsAppIntent(
  rawText: string,
  context?: {
    customerName?: string;
  }
): Promise<IntentClassificationResult | null> {
  if (!hasLLMConfigured()) {
    return null;
  }

  // NOTE: Gemini does not support role:"system" — it returns an empty response which
  // causes "model output must contain either output text or tool calls". We embed the
  // system instruction directly in the user message to stay provider-agnostic.
  const prompt = `[SYSTEM] You are a JSON-only intent classifier for a luxury real estate WhatsApp concierge.
Analyze the user's incoming WhatsApp message, which may contain Malaysian slang (Manglish), abbreviations, typos, or informal phrasing.

Classify the user's intent into EXACTLY ONE of the following:
- "CANCEL": The user wants to cancel, call off, or withdraw from an existing viewing/tour appointment (e.g. "x jadi la", "cncl", "can't go tomorrow", "drop my slot", "not free anymore").
- "RESCHEDULE": The user wants to change the date or time of an existing appointment (e.g. "resched tmrw", "can we do another day", "push back 1 hour", "tukar tarikh", "can change time?").
- "STATUS": The user wants to check, view, or ask about their existing appointments, schedule, or bookings (e.g. "check appt", "when is my tour", "any viewings today", "am I booked for anything", "sched").
- "SHORTLIST": The user wants to see their saved properties, shortlist, favorites, or wishlist (e.g. "shrtlist", "what did I star", "show my favs", "my saved homes").
- "BOOK": The user wants to schedule or book a private tour for a residence/property (e.g. "wanna book that one", "nak book", "can I tour unit 1", "set viewing for the penthouse", "book 2").
- "AGENT": The user wants to contact, call, or speak with their assigned luxury specialist or a human agent (e.g. "agent phone", "talk to human", "who is my agent", "call broker").
- "UNKNOWN": General greetings ("hi", "hello"), polite remarks ("thank you"), or completely unrelated statements.

Also extract:
- "id": number or null (if the user mentioned a specific booking ID like "#5" or "booking 12").
- "targetPropertyIndex": number or null (if the user selected a shortlist property index like "1", "unit 2", "the first one").

Incoming message: "${rawText.replace(/"/g, '\\"')}"

Respond ONLY with a valid JSON object, no markdown, no preamble:
{"intent": "CANCEL"|"RESCHEDULE"|"STATUS"|"SHORTLIST"|"BOOK"|"AGENT"|"UNKNOWN", "id": null, "targetPropertyIndex": null}`;

  try {
    const res = await Promise.race([
      invokeLLM({
        // Single user message — avoids role:"system" which Gemini does not support.
        messages: [
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM classification timed out")), 2500)
      ),
    ]);

    const raw = res?.choices?.[0]?.message?.content;
    const content = typeof raw === "string" ? raw.trim() : "";

    // Guard: empty content means the model produced nothing (e.g. safety filter) — bail gracefully.
    if (!content) {
      console.warn("[WhatsApp NLP] LLM returned empty content — using heuristic fallback.");
      return null;
    }

    const jsonStr = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as IntentClassificationResult;
    return parsed;
  } catch (err) {
    console.warn("[WhatsApp NLP] LLM classification skipped/failed:", (err as Error)?.message || err);
    return null;
  }
}

/**
 * Main parser and handler for incoming WhatsApp messages
 */
export async function handleIncomingWhatsAppMessage(
  payload: IncomingWhatsAppPayload
): Promise<WhatsAppProcessingResult> {
  const rawFrom = payload.from.replace("whatsapp:", "").trim();
  const text = payload.body.trim();
  const lowerText = text.toLowerCase();
  const { normalized, originalLower, extractedId, extractedItemNumber } = normalizeWhatsAppText(text);

  // 1. Identify customer account by phone or name
  // If a customerAccountIdHint is provided (e.g. from a live Baileys session), use it directly
  // to avoid cross-account bleed when two test accounts share the same phone number.
  let customer = payload.customerAccountIdHint
    ? await dbFeature.getCustomerAccountById(payload.customerAccountIdHint)
    : await dbFeature.findCustomerAccountByPhone(rawFrom);
  if (!customer && payload.senderName) {
    customer = await dbFeature.findCustomerAccountByName(payload.senderName);
  }
  const customerName = customer?.name || payload.senderName || "Valued Client";

  // 2a. Check for active reschedule session (multi-step flow)
  const existingSession = sessionFor(rawFrom);

  if (existingSession) {
    if (existingSession.step === "awaiting_id") {
      // Allow user to abort reschedule mid-flow with common words/slang
      if (
        /^(cancel|batal|stop|quit|exit|abort|nevermind|nvm)$/i.test(normalized) ||
        /^(cancel|batal|stop|quit|exit|abort|nevermind|nvm)$/i.test(originalLower)
      ) {
        clearSession(rawFrom);
        const reply = `Rescheduling cancelled. Reply *STATUS* to view your bookings anytime.`;
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: undefined, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return { success: true, action: "general_chat", replyMessage: reply, customer };
      }

      // Customer should provide a booking ID
      const explicitId = extractedId ?? (text.match(/#?(\d+)/) ? parseInt(text.match(/#?(\d+)/)![1], 10) : null);
      if (!explicitId) {
        const reply = [
          `*PROPERLY LUXURY REAL ESTATE*`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `Please reply with the booking number to reschedule. Example: *5* or *#5*`,
          `Or reply *CANCEL* to abort the reschedule.`,
        ].join("\n");
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: undefined, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return {
          success: false,
          action: "general_chat",
          replyMessage: reply,
          customer,
        };
      }
      const viewingId = explicitId;
      const viewing = await dbFeature.getViewingById(viewingId);
      if (!viewing || viewing.status === "Cancelled") {
        clearSession(rawFrom);
        const reply = `Booking #${viewingId} was not found or is already cancelled. Please check your booking ID and try *RESCHEDULE* again.`;
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return {
          success: false,
          action: "unknown",
          replyMessage: reply,
          customer,
        };
      }
      setSession(rawFrom, { step: "awaiting_date", viewingId, expiresAt: Date.now() + SESSION_TTL_MS });
      const askDate = [
        `*Rescheduling #${viewingId}: ${viewing.propertyTitle}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `What is your preferred new date?`,
        `Please reply in the format: *DD MMM YYYY*`,
        `Example: *20 Oct 2026*, or reply *Tomorrow*.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: askDate, status: "sent" });
      return {
        success: true,
        action: "general_chat",
        replyMessage: askDate,
        customer,
      };
    }

    if (existingSession.step === "awaiting_date") {
      if (
        /^(cancel|batal|stop|quit|exit|abort|nevermind|nvm)$/i.test(normalized) ||
        /^(cancel|batal|stop|quit|exit|abort|nevermind|nvm)$/i.test(originalLower)
      ) {
        clearSession(rawFrom);
        const reply = `Rescheduling cancelled. Reply *STATUS* to view your bookings anytime.`;
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return { success: true, action: "general_chat", replyMessage: reply, customer };
      }

      // Check if user picked one of the numbered smart slots (e.g. "1", "2", "3", "4", "option 1", "first")
      const smartSlots = getSmartRescheduleSlots();
      const choiceIdx = extractedItemNumber != null ? extractedItemNumber - 1 : (/^[1-4]$/.test(text.trim()) ? parseInt(text.trim(), 10) - 1 : -1);

      if (choiceIdx >= 0 && choiceIdx < smartSlots.length) {
        const slot = smartSlots[choiceIdx];
        const viewingId = existingSession.viewingId!;
        const oldViewing = await dbFeature.getViewingById(viewingId);
        clearSession(rawFrom);

        // Strict double-booking check for quick reschedule slot
        const { checkSlotAvailability, updateGoogleCalendarEvent } = await import("./googleCalendarService");
        const availCheck = await checkSlotAvailability({
          agentId: oldViewing?.agentId || "darryl",
          date: slot.date,
          timeSlot: slot.timeSlot,
          excludeViewingId: viewingId,
        });

        if (!availCheck.available) {
          const conflictReply = [
            `*⚠️ CALENDAR CONFLICT DETECTED*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `Apologies *${customerName}*, slot *${slot.date} (${slot.timeSlot})* is no longer available.`,
            `*Reason:* ${availCheck.reason || "Existing calendar commitment"}`,
            ``,
            `Please choose another quick option (1-${smartSlots.length}) or type a custom date/time.`,
          ].join("\n");

          await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: conflictReply, status: "sent", parsedAction: "reschedule_viewing" });

          return { success: false, action: "general_chat", replyMessage: conflictReply, customer };
        }

        const updatedViewing = await dbFeature.rescheduleViewingDirect(viewingId, slot.date, slot.timeSlot);
        if (!updatedViewing) {
          return {
            success: false,
            action: "unknown",
            replyMessage: `Sorry, we could not reschedule booking #${viewingId}. Please try again or contact your specialist directly.`,
            customer,
          };
        }

        // Sync reschedule with Google Calendar
        if (oldViewing?.googleCalendarEventId) {
          try {
            await updateGoogleCalendarEvent({
              eventId: oldViewing.googleCalendarEventId,
              agentId: updatedViewing.agentId,
              newDate: slot.date,
              newTimeSlot: slot.timeSlot,
            });
          } catch (calErr) {
            console.warn("[GoogleCalendar] WhatsApp quick reschedule sync notice:", calErr);
          }
        }

        const reply = formatRescheduleConfirmation(updatedViewing, customerName);
        const agentAlert = formatAgentRescheduleAlert(updatedViewing, customerName, rawFrom);

        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: `Selected Quick Slot ${choiceIdx + 1}: ${slot.date} (${slot.timeSlot})`, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "booking_confirmation", message: reply, status: "sent", parsedAction: "reschedule_viewing" });
        await dbFeature.logWhatsAppMessage({ phone: updatedViewing.agentPhone, senderName: "Properly System", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "reminder", message: agentAlert, status: "sent", parsedAction: "reschedule_viewing" });

        try {
          const { sendLiveWhatsAppMessage, sendViewingCalendarInvite } = await import("./whatsappBaileys");
          await sendLiveWhatsAppMessage(updatedViewing.agentPhone, agentAlert);
          await sendViewingCalendarInvite(updatedViewing, customer);
        } catch {}

        try {
          const { notifyViewingRescheduled } = await import("./emailService");
          await notifyViewingRescheduled({
            viewing: updatedViewing,
            customer: {
              id: customer?.id,
              name: customerName,
              email: customer?.email || "darrylraushansingh@gmail.com",
              phone: rawFrom,
            },
            oldDate: oldViewing?.date,
            oldSlot: oldViewing?.timeSlot,
            source: "whatsapp_bot",
          });
        } catch (emailErr) {
          console.warn("[EmailService] WhatsApp bot reschedule email dispatch failed:", emailErr);
        }

        return {
          success: true,
          action: "viewing_rescheduled",
          replyMessage: reply,
          viewing: updatedViewing,
          customer,
          details: { rescheduledViewingId: viewingId, newDate: slot.date, newTimeSlot: slot.timeSlot, icsContent: generateViewingIcs(updatedViewing, customerName, customer?.email) },
        };
      }

      // Parse custom date with natural language flexibility ("tomorrow", "25 Oct", "25/10/2026", etc.)
      const parsedDate = parseFlexibleWhatsAppDate(text);
      if (!parsedDate) {
        const askAgainSlots = getSmartRescheduleSlots().map((s, i) => `${i + 1}️⃣ Reply *${i + 1}* for *${s.label}*`).join("\n");
        const reply = [
          `I couldn't recognise that as a date or slot. Please choose a slot or type a date:`,
          ``,
          askAgainSlots,
          ``,
          `👉 Or reply with format *DD MMM YYYY* (e.g. *20 Oct 2026* or *Tomorrow*).`,
        ].join("\n");
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return {
          success: false,
          action: "general_chat",
          replyMessage: reply,
          customer,
        };
      }
      const dateText = parsedDate;
      setSession(rawFrom, { ...existingSession, step: "awaiting_time", newDate: dateText, expiresAt: Date.now() + SESSION_TTL_MS });
      const askTime = [
        `*New date noted:* ${dateText}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `What time would you prefer?`,
        `Reply with your preferred time slot. Examples:`,
        `• *11:00 AM - 12:00 PM*`,
        `• *02:30 PM - 03:30 PM*`,
        `• *Morning* or *Afternoon*`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId: existingSession.viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: askTime, status: "sent" });
      return {
        success: true,
        action: "general_chat",
        replyMessage: askTime,
        customer,
      };
    }

    if (existingSession.step === "awaiting_time" && existingSession.viewingId && existingSession.newDate) {
      const timeText = text.trim();
      const viewingId = existingSession.viewingId;
      const newDate = existingSession.newDate;
      const oldViewing = await dbFeature.getViewingById(viewingId);

      clearSession(rawFrom);

      // Strict double-booking check for custom reschedule slot
      const { checkSlotAvailability, updateGoogleCalendarEvent } = await import("./googleCalendarService");
      const availCheck = await checkSlotAvailability({
        agentId: oldViewing?.agentId || "darryl",
        date: newDate,
        timeSlot: timeText,
        excludeViewingId: viewingId,
      });

      if (!availCheck.available) {
        const conflictReply = [
          `*⚠️ CALENDAR CONFLICT DETECTED*`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `Apologies *${customerName}*, specialist is unavailable on *${newDate}* at *${timeText}*.`,
          `*Reason:* ${availCheck.reason || "Existing calendar commitment"}`,
          ``,
          `Please reply with another preferred time window (e.g. *10:00 AM*, *02:30 PM*, *04:30 PM*).`,
        ].join("\n");

        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: conflictReply, status: "sent", parsedAction: "reschedule_viewing" });

        return { success: false, action: "general_chat", replyMessage: conflictReply, customer };
      }

      const updatedViewing = await dbFeature.rescheduleViewingDirect(viewingId, newDate, timeText);
      if (!updatedViewing) {
        return {
          success: false,
          action: "unknown",
          replyMessage: `Sorry, we could not reschedule booking #${viewingId}. Please try again or contact your specialist directly.`,
          customer,
        };
      }

      // Sync reschedule with Google Calendar
      if (oldViewing?.googleCalendarEventId) {
        try {
          await updateGoogleCalendarEvent({
            eventId: oldViewing.googleCalendarEventId,
            agentId: updatedViewing.agentId,
            newDate,
            newTimeSlot: timeText,
          });
        } catch (calErr) {
          console.warn("[GoogleCalendar] WhatsApp custom reschedule sync notice:", calErr);
        }
      }

      const reply = formatRescheduleConfirmation(updatedViewing, customerName);
      const agentAlert = formatAgentRescheduleAlert(updatedViewing, customerName, rawFrom);

      // Log all messages
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: `Reschedule: ${newDate} at ${timeText}`, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "booking_confirmation", message: reply, status: "sent", parsedAction: "reschedule_viewing" });
      await dbFeature.logWhatsAppMessage({ phone: updatedViewing.agentPhone, senderName: "Properly System", viewingId, customerAccountId: customer?.id, direction: "outgoing", messageType: "reminder", message: agentAlert, status: "sent", parsedAction: "reschedule_viewing" });

      // Dispatch live WhatsApp alert to agent and updated .ics calendar invite
      try {
        const { sendLiveWhatsAppMessage, sendViewingCalendarInvite } = await import("./whatsappBaileys");
        await sendLiveWhatsAppMessage(updatedViewing.agentPhone, agentAlert);
        await sendViewingCalendarInvite(updatedViewing, customer);
      } catch (e) { /* silent if offline */ }

      try {
        const { notifyViewingRescheduled } = await import("./emailService");
        await notifyViewingRescheduled({
          viewing: updatedViewing,
          customer: {
            id: customer?.id,
            name: customerName,
            email: customer?.email || "darrylraushansingh@gmail.com",
            phone: rawFrom,
          },
          oldDate: oldViewing?.date,
          oldSlot: oldViewing?.timeSlot,
          source: "whatsapp_bot",
        });
      } catch (emailErr) {
        console.warn("[EmailService] WhatsApp bot reschedule email dispatch failed:", emailErr);
      }

      return {
        success: true,
        action: "viewing_rescheduled",
        replyMessage: reply,
        viewing: updatedViewing,
        customer,
        details: { rescheduledViewingId: viewingId, newDate, newTimeSlot: timeText, icsContent: generateViewingIcs(updatedViewing, customerName, customer?.email) },
      };
    }
  }

  // 3. Fast Intent Classification via Normalized Text & Enhanced Regex
  let detectedIntent: "CANCEL" | "RESCHEDULE" | "STATUS" | "SHORTLIST" | "BOOK" | "AGENT" | "CALENDAR" | null = null;
  let targetViewingId = extractedId ?? undefined;
  let targetBookIndex = extractedItemNumber ?? undefined;

  // Layer 1: Slang & abbreviation pattern matching
  if (
    /\b(calendar|ics|ical|invite)\b/i.test(normalized) ||
    /^(calendar|ics|ical|invite|export calendar|send calendar|get calendar|calendar invite|add to calendar)$/i.test(originalLower) ||
    /^(4|option 4|opt 4)$/i.test(originalLower)
  ) {
    detectedIntent = "CALENDAR";
  } else if (
    /\b(reschedule)\b/i.test(normalized) ||
    /^(reschedule|tukar|change appointment|change booking|change tour|change my appointment|change my viewing)/i.test(originalLower) ||
    /^(2|option 2|opt 2)$/i.test(originalLower) ||
    /\b(can we|can i|wanna|want to|need to|could we|pls|please)\b.*\b(reschedule|change|move|shift|postpone|tukar)\b.*\b(time|date|slot|day|tour|viewing|appointment|appt|booking)\b/i.test(normalized) ||
    /\b(change|tukar|shift|move|postpone)\b.*\b(date|tarikh|time|masa|slot|day|appt|appointment|booking|viewing|tour)\b/i.test(normalized) ||
    /\b(another|different)\s+(day|date|time|slot)\b/i.test(normalized)
  ) {
    detectedIntent = "RESCHEDULE";
  } else if (
    /\b(cancel)\b/i.test(normalized) ||
    /^(cancel|batal|cannot make it|can't make it|unable to make it|unable to attend|cancel appointment|cancel viewing|cancel tour|drop appointment|not able to come)/i.test(originalLower) ||
    /^(1|option 1|opt 1)$/i.test(originalLower) ||
    /\b(cannot make it|cant make it|wont make it|not able to attend|unable to attend|not coming|drop my slot|drop appointment)\b/i.test(normalized) ||
    /\b(tak jadi|x jadi|tk jadi|batal)\b/i.test(originalLower)
  ) {
    detectedIntent = "CANCEL";
  } else if (
    /\b(shortlist)\b/i.test(normalized) ||
    /^(shortlist|my shortlist|saved|saved properties|wishlist|favourites|favorites|my saved|my favourites|my favorites|my wishlist)$/i.test(originalLower) ||
    /\b(what did i save|show saved|my favs|show favourites|show favorites|my wishlist|saved properties|saved residences|saved units|saved homes)\b/i.test(normalized)
  ) {
    detectedIntent = "SHORTLIST";
  } else if (
    /^(?:book|bk)\b/i.test(normalized) ||
    /\b(book)\s+#?(\d+)\b/i.test(originalLower) ||
    /\b(book|reserve)\b.*\b(tour|viewing|private tour|appointment|slot|residence|house|condo|unit)\b/i.test(normalized) ||
    /\b(want to|wanna|can i|could i|please|pls)\b.*\b(book|tour|view)\b/i.test(normalized) ||
    /^(nak book|nak tengok|nak tgk|nak lawat|nak visit)/i.test(originalLower)
  ) {
    detectedIntent = "BOOK";
  } else if (
    /\b(agent)\b/i.test(normalized) ||
    /^(agent|specialist|private agent|speak with agent|call agent|contact agent)$/i.test(originalLower) ||
    /^(3|option 3|opt 3)$/i.test(originalLower) ||
    /\b(agent|specialist)\b.*(contact|number|phone|call|talk|speak|reach|who)/i.test(normalized) ||
    /\b(speak|talk|call|contact|reach|chat)\b.*(agent|specialist|advisor|consultant|human)/i.test(normalized) ||
    /\b(who is my|what is my).*(agent|specialist)\b/i.test(normalized)
  ) {
    detectedIntent = "AGENT";
  } else if (
    /^(status|viewing|viewings|appointment|appointments|schedule|jadual|bookings|booking|tours|tour|my bookings|my tours|my viewings|my appointments)$/i.test(originalLower) ||
    /\b(status)\b/i.test(normalized) ||
    /\b(what|whats|when|which|show|check|view|list|see|get|find|tell|details|any|where)\b.*(scheduled|schedule|booking|bookings|appointment|appointments|tour|tours|viewing|viewings|booked|slot|slots|time)/i.test(normalized) ||
    /\b(scheduled now|scheduled today|scheduled next|upcoming|my schedule|my appointment|my booking|my tour|my viewing|have scheduled|have booked)\b/i.test(normalized) ||
    /do i have (any|a|my) (booking|viewing|appointment|tour|schedule)/i.test(normalized) ||
    /\b(check appointment|check schedule|check booking|my appointment|my schedule|my booking)\b/i.test(normalized)
  ) {
    detectedIntent = "STATUS";
  }

  // Layer 2: LLM Semantic Classifier Fallback (for complex natural language, typos, or conversational messages)
  if (!detectedIntent) {
    try {
      const llmResult = await classifyWhatsAppIntent(text, { customerName });
      if (llmResult && llmResult.intent !== "UNKNOWN") {
        detectedIntent = llmResult.intent;
        if (llmResult.id != null && targetViewingId == null) {
          targetViewingId = llmResult.id;
        }
        if (llmResult.targetPropertyIndex != null && targetBookIndex == null) {
          targetBookIndex = llmResult.targetPropertyIndex;
        }
      }
    } catch {
      // Continue gracefully if LLM offline or timed out
    }
  }

  // 2aa. Check for active BOOK session (multi-step booking flow).
  // Safety valve: if the user typed an explicit command or abort word, clear the
  // book session and fall through to normal command processing so they are never
  // trapped in the flow.
  const isAbortBookCommand =
    detectedIntent !== null ||
    /^(cancel|batal|status|viewing|agent|specialist|reschedule|shortlist|book|stop|quit|exit|abort|help|nevermind|nvm)$/i.test(
      normalized
    ) ||
    /^(cancel|batal|status|viewing|agent|specialist|reschedule|shortlist|book|stop|quit|exit|abort|help|nevermind|nvm)$/i.test(
      originalLower
    );
  const existingBookSession = bookSessionFor(rawFrom);

  if (existingBookSession && !isAbortBookCommand) {
    // ── Step 1: customer picks a property by number ──
    if (existingBookSession.step === "awaiting_property") {
      const chosenNum = extractedItemNumber;
      if (!chosenNum || !existingBookSession.shortlistProperties) {
        const reply = `Please reply with a number from your shortlist, e.g. *1* or *2*.\nOr reply *SHORTLIST* to see your saved properties again.`;
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return { success: false, action: "general_chat", replyMessage: reply, customer };
      }
      const idx = chosenNum - 1;
      const prop = existingBookSession.shortlistProperties[idx];
      if (!prop) {
        const reply = `That number is not on your shortlist. Please reply with a valid number, e.g. *1* or *2*.`;
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return { success: false, action: "general_chat", replyMessage: reply, customer };
      }
      setBookSession(rawFrom, {
        ...existingBookSession,
        step: "awaiting_date",
        propertyId: prop.id,
        propertyTitle: prop.title,
        propertyLocation: prop.location,
        propertyPrice: prop.price,
        propertyBeds: prop.beds,
        propertyImage: prop.propertyImage,
        expiresAt: Date.now() + BOOK_SESSION_TTL_MS,
      });
      const askDate = [
        `*Booking Tour: ${prop.title}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📍 ${prop.location} | RM ${prop.price.toLocaleString()} | ${prop.beds} bed`,
        ``,
        `What is your preferred date for the private tour?`,
        `Please reply in the format: *DD MMM YYYY*`,
        `Example: *25 Oct 2026*, or reply *Tomorrow*.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: askDate, status: "sent" });
      return { success: true, action: "general_chat", replyMessage: askDate, customer };
    }

    // ── Step 2: customer provides preferred date ──
    if (existingBookSession.step === "awaiting_date") {
      const parsedDate = parseFlexibleWhatsAppDate(text);
      if (!parsedDate) {
        const reply = [
          `I couldn't recognise that as a date. Please reply in the format:`,
          `*DD MMM YYYY* — Example: *25 Oct 2026*, or reply *Tomorrow*.`,
        ].join("\n");
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
        return { success: false, action: "general_chat", replyMessage: reply, customer };
      }
      const dateText = parsedDate;
      setBookSession(rawFrom, { ...existingBookSession, step: "awaiting_time", newDate: dateText, expiresAt: Date.now() + BOOK_SESSION_TTL_MS });
      const askTime = [
        `*Date confirmed: ${dateText}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `What time would you prefer for your private tour?`,
        `Reply with your preferred time slot:`,
        `• *10:00 AM*`,
        `• *2:00 PM - 3:00 PM*`,
        `• *Morning* or *Afternoon*`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: askTime, status: "sent" });
      return { success: true, action: "general_chat", replyMessage: askTime, customer };
    }

    // ── Step 3: customer provides preferred time → create the viewing ──
    if (existingBookSession.step === "awaiting_time" && existingBookSession.propertyId && existingBookSession.newDate) {
      const timeText = text.trim();
      const { propertyId, propertyTitle, propertyLocation, propertyPrice, propertyImage, newDate } = existingBookSession;
      clearBookSession(rawFrom);

      if (!customer) {
        return { success: false, action: "unknown", replyMessage: `We could not find your account. Please log in to the portal to complete your booking.`, customer };
      }

      // Resolve agent — prefer customer's assigned specialist, fall back to default
      let agentId = customer.assignedAgentId || "amir";
      let agentName = "Amir Rahman";
      let agentPhone = "+60 17-291 8832";
      if (customer.assignedAgentId) {
        try {
          const agent = await dbFeature.getAgentByCode(customer.assignedAgentId);
          if (agent) {
            agentName = agent.name || agentName;
            agentPhone = agent.phone || agentPhone;
          }
        } catch { /* use defaults if lookup fails */ }
      }

      // 1. Strict double-booking check before creating viewing
      const { checkSlotAvailability, createGoogleCalendarEvent } = await import("./googleCalendarService");
      const availCheck = await checkSlotAvailability({
        agentId,
        date: newDate!,
        timeSlot: timeText,
      });

      if (!availCheck.available) {
        const conflictMsg = [
          `*⚠️ SCHEDULE CONFLICT DETECTED*`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `Apologies *${customerName}*, specialist *${agentName}* is unavailable on *${newDate}* at *${timeText}*.`,
          `*Reason:* ${availCheck.reason || "Existing calendar commitment"}`,
          ``,
          `Please reply with another preferred time window (e.g. *10:00 AM*, *02:30 PM*, *04:30 PM*) or type *CANCEL* to stop.`,
        ].join("\n");

        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer.id, direction: "outgoing", messageType: "general_chat", message: conflictMsg, status: "sent", parsedAction: "book_viewing" });

        return {
          success: false,
          action: "general_chat",
          replyMessage: conflictMsg,
          customer,
        };
      }

      const newViewing = await dbFeature.createViewing({
        customerAccountId: customer.id,
        propertyId: propertyId!,
        propertyTitle: propertyTitle!,
        propertyLocation: propertyLocation!,
        propertyPrice: propertyPrice!,
        propertyImage: propertyImage ?? null,
        agentId,
        agentName,
        agentPhone,
        date: newDate!,
        timeSlot: timeText,
        status: "Confirmed",
      });

      // 2. Sync to Google Calendar API
      try {
        const calResult = await createGoogleCalendarEvent({
          viewing: newViewing,
          customer: {
            name: customerName,
            email: customer.email || "darrylraushansingh@gmail.com",
            phone: rawFrom,
          },
        });
        if (calResult.success && calResult.eventId) {
          await dbFeature.updateViewingGoogleCalendar(newViewing.id, {
            googleCalendarEventId: calResult.eventId,
            googleCalendarHtmlLink: calResult.htmlLink || null,
          });
          newViewing.googleCalendarEventId = calResult.eventId;
          newViewing.googleCalendarHtmlLink = calResult.htmlLink || null;
        }
      } catch (calErr) {
        console.warn("[GoogleCalendar] WhatsApp booking sync notice:", calErr);
      }

      const reply = formatViewingConfirmation(newViewing, customerName);
      const agentAlert = [
        `*🔔 SPECIALIST ALERT: New Tour Booked via WhatsApp*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Client *${customerName}* (${rawFrom}) has booked a new private viewing via WhatsApp.`,
        ``,
        `*Residence:* ${newViewing.propertyTitle}`,
        `*Date:* ${newViewing.date}`,
        `*Time:* ${newViewing.timeSlot}`,
        `*Booking Ref:* #${newViewing.id}`,
        `*System State:* Portal calendar updated automatically.`,
      ].join("\n");

      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId: newViewing.id, customerAccountId: customer.id, direction: "incoming", messageType: "general_chat", message: `Tour booked: ${propertyTitle} on ${newDate} at ${timeText}`, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId: newViewing.id, customerAccountId: customer.id, direction: "outgoing", messageType: "booking_confirmation", message: reply, status: "sent", parsedAction: "book_viewing" });
      await dbFeature.logWhatsAppMessage({ phone: agentPhone, senderName: "Properly System", viewingId: newViewing.id, customerAccountId: customer.id, direction: "outgoing", messageType: "reminder", message: agentAlert, status: "sent", parsedAction: "book_viewing" });

      // Push live alert to the agent's linked WhatsApp
      try {
        const { sendLiveWhatsAppMessage } = await import("./whatsappBaileys");
        await sendLiveWhatsAppMessage(agentPhone, agentAlert);
      } catch { /* silent if device offline */ }

      return {
        success: true,
        action: "viewing_booked",
        replyMessage: reply,
        viewing: newViewing,
        customer,
        details: { bookedViewingId: newViewing.id, propertyTitle, newDate, newTimeSlot: timeText },
      };
    }
  } else if (existingBookSession && isAbortBookCommand) {
    // User typed a command mid-flow — clear the book session and fall through
    clearBookSession(rawFrom);
  }

  // 2b. Check for RESCHEDULE command to start the reschedule flow
  const isReschedule = detectedIntent === "RESCHEDULE";

  if (isReschedule) {
    const idMatch = text.match(/#?(\d+)/);
    let targetViewing: PropertyViewing | undefined;

    const explicitId = targetViewingId ?? (idMatch ? parseInt(idMatch[1], 10) : undefined);
    if (explicitId) {
      const explicit = await dbFeature.getViewingById(explicitId);
      if (explicit && explicit.status === "Confirmed") targetViewing = explicit;
    }

    if (!targetViewing && customer) {
      const all = await dbFeature.getViewingsByCustomer(customer.id);
      const confirmed = all.filter((v) => v.status === "Confirmed");
      if (confirmed.length === 1) {
        targetViewing = confirmed[0];
      } else if (confirmed.length > 1) {
        // Ask which one
        const list = confirmed.map((v) => `• *#${v.id}* — ${v.propertyTitle} (${v.date}, ${v.timeSlot})`).join("\n");
        setSession(rawFrom, { step: "awaiting_id", expiresAt: Date.now() + SESSION_TTL_MS });
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
        const ask = [
          `*Which booking would you like to reschedule?*`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          list,
          ``,
          `Reply with the booking number, e.g. *#${confirmed[0].id}*`,
        ].join("\n");
        await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: ask, status: "sent" });
        return { success: true, action: "general_chat", replyMessage: ask, customer };
      }
    }

    if (!targetViewing) {
      const noBookingReply = [
        `*PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Hello *${customerName}*, we could not find an active confirmed booking to reschedule.`,
        ``,
        `Reply *STATUS* to view your bookings, or *RESCHEDULE #[ID]* to reschedule a specific one.`,
      ].join("\n");
      return { success: false, action: "unknown", replyMessage: noBookingReply, customer };
    }

    // Start the reschedule session at awaiting_date step
    setSession(rawFrom, { step: "awaiting_date", viewingId: targetViewing.id, expiresAt: Date.now() + SESSION_TTL_MS });
    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, viewingId: targetViewing.id, customerAccountId: customer?.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "reschedule_viewing", rawPayload: JSON.stringify(payload) });
    const smartSlots = getSmartRescheduleSlots();
    const slotList = smartSlots.map((s, idx) => `${idx + 1}️⃣ Reply *${idx + 1}* for *${s.label}*`).join("\n");
    const askDate = [
      `*Rescheduling #${targetViewing.id}: ${targetViewing.propertyTitle}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Current slot: *${targetViewing.date}* at *${targetViewing.timeSlot}*`,
      ``,
      `*Choose a 1-Tap Quick Slot:*`,
      slotList,
      ``,
      `👉 Or reply with any custom date (e.g. *25 Oct 2026* or *Tomorrow*).`,
    ].join("\n");
    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", viewingId: targetViewing.id, customerAccountId: customer?.id, direction: "outgoing", messageType: "general_chat", message: askDate, status: "sent" });
    return { success: true, action: "general_chat", replyMessage: askDate, customer };
  }

  // 2c. Check for cancellation commands
  const isCancellation = detectedIntent === "CANCEL";

  if (isCancellation) {
    // Check if a specific ID was mentioned (e.g., "#5", "5", or targetViewingId)
    const idMatch = text.match(/#?(\d+)/);
    let targetViewing: PropertyViewing | undefined;

    const explicitId = targetViewingId ?? (idMatch && idMatch[1] ? parseInt(idMatch[1], 10) : undefined);
    if (explicitId) {
      const viewing = await dbFeature.getViewingById(explicitId);
      if (viewing) {
        targetViewing = viewing;
      }
    }

    // If no explicit ID or viewing not found by ID, look up the customer's active confirmed viewings
    if (!targetViewing && customer) {
      const customerViewings = await dbFeature.getViewingsByCustomer(customer.id);
      const confirmedViewings = customerViewings.filter((v) => v.status === "Confirmed");

      // Contextual match: does the message mention an agent's name (e.g. "Amir", "Hannah") or property name?
      const contextualMatch = confirmedViewings.find((v) => {
        const agentFirst = v.agentName.toLowerCase().split(" ")[0];
        const propWords = v.propertyTitle.toLowerCase().split(" ").filter((w) => w.length > 3);
        return (
          lowerText.includes(agentFirst) ||
          propWords.some((w) => lowerText.includes(w))
        );
      });

      if (contextualMatch) {
        targetViewing = contextualMatch;
      } else if (confirmedViewings.length > 0) {
        // Default to latest confirmed viewing
        targetViewing = confirmedViewings[0];
      }
    }

    if (!targetViewing) {
      targetViewing = await dbFeature.getUpcomingViewingForPhone(rawFrom);
    }

    if (targetViewing) {
      // Execute the cancellation directly in DB
      const updatedViewing = await dbFeature.cancelViewingDirect(
        targetViewing.id,
        "whatsapp",
        `Direct cancellation via WhatsApp message: "${text}"`
      );

      // Delete Google Calendar event if synced
      if (targetViewing.googleCalendarEventId) {
        try {
          const { deleteGoogleCalendarEvent } = await import("./googleCalendarService");
          await deleteGoogleCalendarEvent({
            eventId: targetViewing.googleCalendarEventId,
            agentId: targetViewing.agentId,
          });
        } catch (calErr) {
          console.warn("[GoogleCalendar] WhatsApp cancellation sync notice:", calErr);
        }
      }

      const reply = formatCancellationConfirmation(
        targetViewing,
        customerName
      );

      // Log incoming cancellation message
      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: customerName,
        viewingId: targetViewing.id,
        customerAccountId: customer?.id,
        direction: "incoming",
        messageType: "cancellation_request",
        message: text,
        status: "received",
        parsedAction: "cancel_viewing",
        rawPayload: JSON.stringify(payload),
      });

      // Log outgoing confirmation message
      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: "Properly Concierge Bot",
        viewingId: targetViewing.id,
        customerAccountId: customer?.id,
        direction: "outgoing",
        messageType: "cancellation_confirmation",
        message: reply,
        status: "sent",
        parsedAction: "cancel_viewing",
      });

      // Also log alert to agent
      const agentAlert = formatAgentCancellationAlert(
        targetViewing,
        customerName,
        rawFrom
      );
      await dbFeature.logWhatsAppMessage({
        phone: targetViewing.agentPhone,
        senderName: "Properly System",
        viewingId: targetViewing.id,
        customerAccountId: customer?.id,
        direction: "outgoing",
        messageType: "reminder",
        message: agentAlert,
        status: "sent",
        parsedAction: "cancel_viewing",
      });

      // Dispatch live alert to agent phone via real WhatsApp if connected
      try {
        const { sendLiveWhatsAppMessage } = await import("./whatsappBaileys");
        await sendLiveWhatsAppMessage(targetViewing.agentPhone, agentAlert);
      } catch (e) {
        // silent if offline
      }

      return {
        success: true,
        action: "viewing_cancelled",
        replyMessage: reply,
        viewing: updatedViewing || targetViewing,
        customer,
        details: {
          cancelledViewingId: targetViewing.id,
          propertyTitle: targetViewing.propertyTitle,
          agentName: targetViewing.agentName,
        },
      };
    } else {
      // No active viewing found to cancel
      const reply = [
        `*PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Hello *${customerName}*, we could not locate an active upcoming tour associated with your request.`,
        ``,
        `If you are referring to a specific booking ID, please reply with *CANCEL #[ID]* (e.g. *CANCEL #12*).`,
        `Or visit your Customer Portal to view and manage all your tour schedules.`,
      ].join("\n");

      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: customerName,
        customerAccountId: customer?.id,
        direction: "incoming",
        messageType: "cancellation_request",
        message: text,
        status: "received",
        parsedAction: "cancel_viewing",
        rawPayload: JSON.stringify(payload),
      });

      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: "Properly Concierge Bot",
        customerAccountId: customer?.id,
        direction: "outgoing",
        messageType: "general_chat",
        message: reply,
        status: "sent",
      });

      return {
        success: false,
        action: "unknown",
        replyMessage: reply,
        customer,
      };
    }
  }

  // 3. Agent / Specialist Contact Query
  const isAgentQuery = detectedIntent === "AGENT";

  if (isAgentQuery) {
    let activeViewing: PropertyViewing | undefined;
    if (customer) {
      const all = await dbFeature.getViewingsByCustomer(customer.id);
      activeViewing = all.find((v) => v.status === "Confirmed");
    }
    if (!activeViewing) {
      activeViewing = await dbFeature.getUpcomingViewingForPhone(rawFrom);
    }

    const reply = formatAgentQuery(customerName, activeViewing);

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: customerName,
      customerAccountId: customer?.id,
      direction: "incoming",
      messageType: "general_chat",
      message: text,
      status: "received",
      parsedAction: "agent_contact",
      rawPayload: JSON.stringify(payload),
    });

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: "Properly Concierge Bot",
      customerAccountId: customer?.id,
      direction: "outgoing",
      messageType: "general_chat",
      message: reply,
      status: "sent",
    });

    return {
      success: true,
      action: "general_chat",
      replyMessage: reply,
      customer,
    };
  }

  // 4. Status Query / Schedule Inquiry (Natural Language)
  const isStatusQuery = detectedIntent === "STATUS";

  if (isStatusQuery) {
    let viewings: PropertyViewing[] = [];
    if (customer) {
      const all = await dbFeature.getViewingsByCustomer(customer.id);
      viewings = all.filter((v) => v.status === "Confirmed");
    }
    if (viewings.length === 0) {
      const byPhone = await dbFeature.getUpcomingViewingForPhone(rawFrom);
      if (byPhone && byPhone.status === "Confirmed") {
        viewings = [byPhone];
      }
    }

    const reply = customer
      ? formatStatusQuery(customer, viewings)
      : (viewings.length > 0
          ? formatStatusQuery({ id: 0, name: customerName, email: "", phone: rawFrom, createdAt: new Date().toISOString() }, viewings)
          : `Hello! Please log in to your Properly Customer Portal or book a private tour to manage your appointments.`);

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: customerName,
      customerAccountId: customer?.id,
      direction: "incoming",
      messageType: "status_query",
      message: text,
      status: "received",
      parsedAction: "query_status",
      rawPayload: JSON.stringify(payload),
    });

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: "Properly Concierge Bot",
      customerAccountId: customer?.id,
      direction: "outgoing",
      messageType: "status_query",
      message: reply,
      status: "sent",
    });

    return {
      success: true,
      action: "status_query",
      replyMessage: reply,
      customer,
    };
  }

  // 4b. CALENDAR / .ICS Invite Request
  const isCalendar = detectedIntent === "CALENDAR";

  if (isCalendar) {
    let viewings: PropertyViewing[] = [];
    if (customer) {
      const all = await dbFeature.getViewingsByCustomer(customer.id);
      viewings = all.filter((v) => v.status === "Confirmed");
    }
    if (viewings.length === 0) {
      const byPhone = await dbFeature.getUpcomingViewingForPhone(rawFrom);
      if (byPhone && byPhone.status === "Confirmed") {
        viewings = [byPhone];
      }
    }

    if (viewings.length === 0) {
      const reply = [
        `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Dear *${customerName}*, you currently have no confirmed upcoming tour appointments to export.`,
        ``,
        `Reply *BOOK* or *SHORTLIST* to schedule a private walkthrough.`,
      ].join("\n");

      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: customerName,
        customerAccountId: customer?.id,
        direction: "incoming",
        messageType: "general_chat",
        message: text,
        status: "received",
        parsedAction: "calendar_invite",
        rawPayload: JSON.stringify(payload),
      });

      await dbFeature.logWhatsAppMessage({
        phone: rawFrom,
        senderName: "Properly Concierge Bot",
        customerAccountId: customer?.id,
        direction: "outgoing",
        messageType: "general_chat",
        message: reply,
        status: "sent",
      });

      return {
        success: true,
        action: "general_chat",
        replyMessage: reply,
        customer,
      };
    }

    const viewing = viewings[0];
    const icsContent = generateViewingIcs(viewing, customerName, customer?.email);
    const reply = [
      `🏛️ *VIP TOUR CALENDAR INVITE (.ICS)*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Residence:* ${viewing.propertyTitle}`,
      `*Date:* ${viewing.date}`,
      `*Time:* ${viewing.timeSlot}`,
      `*Specialist:* ${viewing.agentName} (${viewing.agentPhone})`,
      `*Booking Ref:* #${viewing.id}`,
      ``,
      `📅 *Calendar Invite (.ics)* is attached! Tap the file to add directly to Apple Calendar, Google Calendar, or Outlook.`,
    ].join("\n");

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: customerName,
      viewingId: viewing.id,
      customerAccountId: customer?.id,
      direction: "incoming",
      messageType: "general_chat",
      message: text,
      status: "received",
      parsedAction: "calendar_invite",
      rawPayload: JSON.stringify(payload),
    });

    await dbFeature.logWhatsAppMessage({
      phone: rawFrom,
      senderName: "Properly Concierge Bot",
      viewingId: viewing.id,
      customerAccountId: customer?.id,
      direction: "outgoing",
      messageType: "booking_confirmation",
      message: reply,
      status: "sent",
      parsedAction: "calendar_invite",
    });

    // Send the live ICS file to the connected phone
    try {
      const { sendViewingCalendarInvite } = await import("./whatsappBaileys");
      await sendViewingCalendarInvite(viewing, customer);
    } catch {}

    return {
      success: true,
      action: "calendar_invite",
      replyMessage: reply,
      customer,
      viewing,
      details: {
        icsContent,
        viewingId: viewing.id,
        propertyTitle: viewing.propertyTitle,
      },
    };
  }

  // 5a. SHORTLIST command — show the customer's saved properties with BOOK prompts
  const isShortlist = detectedIntent === "SHORTLIST";

  if (isShortlist) {
    if (!customer) {
      const reply = [
        `*PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Hello *${customerName}*, please log in to your Customer Portal to view and manage your shortlist.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: undefined, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "shortlist_query", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: undefined, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
      return { success: false, action: "general_chat", replyMessage: reply, customer };
    }

    const shortlistedProps = await dbFeature.getShortlistedProperties(customer.id);
    const reply = formatShortlistReply(customer, shortlistedProps);

    // Pre-load a book session so the customer can immediately follow up with BOOK [n]
    if (shortlistedProps.length > 0) {
      setBookSession(rawFrom, {
        step: "awaiting_property",
        shortlistProperties: shortlistedProps.map((p) => ({
          id: p.id,
          title: p.title,
          location: p.location,
          price: p.price,
          beds: p.beds,
          propertyImage: p.imageUrl ?? null,
        })),
        expiresAt: Date.now() + BOOK_SESSION_TTL_MS,
      });
    }

    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "shortlist_query", rawPayload: JSON.stringify(payload) });
    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer.id, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
    return { success: true, action: "general_chat", replyMessage: reply, customer };
  }

  // 5b. BOOK command — initiate a new viewing from the customer's shortlist
  const bookNumberMatch = text.trim().match(/^(?:book)\s+#?(\d+)$/i);
  const isBook = detectedIntent === "BOOK";

  if (isBook) {
    if (!customer) {
      const reply = [
        `*PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Hello *${customerName}*, please log in to your Customer Portal to book a private tour.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: undefined, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: undefined, direction: "outgoing", messageType: "general_chat", message: reply, status: "sent" });
      return { success: false, action: "general_chat", replyMessage: reply };
    }

    const shortlistedProps = await dbFeature.getShortlistedProperties(customer.id);

    // No shortlist saved — direct customer to portal first
    if (shortlistedProps.length === 0) {
      const noShortlistReply = [
        `*PROPERLY LUXURY REAL ESTATE*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Dear *${customerName}*, you have not shortlisted any properties yet.`,
        ``,
        `To book a private tour:`,
        `1️⃣  Log in to your *Customer Portal*`,
        `2️⃣  Browse our exclusive luxury portfolio`,
        `3️⃣  Tap ❤️ to shortlist your favourite residences`,
        `4️⃣  Return here and reply *BOOK* to schedule a tour`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Reply *STATUS* to view existing tours, or *AGENT* to speak with your specialist.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer.id, direction: "outgoing", messageType: "general_chat", message: noShortlistReply, status: "sent" });
      return { success: false, action: "general_chat", replyMessage: noShortlistReply, customer };
    }

    // Resolve target property — either from explicit BOOK [n], targetBookIndex, or auto-select if only one shortlisted
    let targetProp: typeof shortlistedProps[0] | undefined;
    const numToUse = targetBookIndex ?? (bookNumberMatch?.[1] ? parseInt(bookNumberMatch[1], 10) : undefined);
    if (numToUse) {
      const idx = numToUse - 1;
      if (idx >= 0 && idx < shortlistedProps.length) {
        targetProp = shortlistedProps[idx];
      }
    }
    if (!targetProp && shortlistedProps.length === 1) {
      targetProp = shortlistedProps[0];
    }

    if (!targetProp) {
      // Multiple properties, no number — list them and ask which one
      setBookSession(rawFrom, {
        step: "awaiting_property",
        shortlistProperties: shortlistedProps.map((p) => ({
          id: p.id,
          title: p.title,
          location: p.location,
          price: p.price,
          beds: p.beds,
          propertyImage: p.imageUrl ?? null,
        })),
        expiresAt: Date.now() + BOOK_SESSION_TTL_MS,
      });
      const items = shortlistedProps.map(
        (p, i) => `• *${i + 1}. ${p.title}*\n  📍 ${p.location} | RM ${p.price.toLocaleString()} | ${p.beds} bed`
      );
      const ask = [
        `*Which residence would you like to tour?*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        items.join("\n\n"),
        ``,
        `Reply with the number of your preferred property, e.g. *1* or *2*.`,
      ].join("\n");
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
      await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer.id, direction: "outgoing", messageType: "general_chat", message: ask, status: "sent" });
      return { success: true, action: "general_chat", replyMessage: ask, customer };
    }

    // Property identified — start the booking flow at the date step
    setBookSession(rawFrom, {
      step: "awaiting_date",
      propertyId: targetProp.id,
      propertyTitle: targetProp.title,
      propertyLocation: targetProp.location,
      propertyPrice: targetProp.price,
      propertyBeds: targetProp.beds,
      propertyImage: targetProp.imageUrl ?? null,
      expiresAt: Date.now() + BOOK_SESSION_TTL_MS,
    });
    const askDate = [
      `*Booking Tour: ${targetProp.title}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 ${targetProp.location} | RM ${targetProp.price.toLocaleString()} | ${targetProp.beds} bed`,
      ``,
      `What is your preferred date for the private tour?`,
      `Please reply in the format: *DD MMM YYYY*`,
      `Example: *25 Oct 2026*`,
    ].join("\n");
    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: customerName, customerAccountId: customer.id, direction: "incoming", messageType: "general_chat", message: text, status: "received", parsedAction: "book_viewing", rawPayload: JSON.stringify(payload) });
    await dbFeature.logWhatsAppMessage({ phone: rawFrom, senderName: "Properly Concierge Bot", customerAccountId: customer.id, direction: "outgoing", messageType: "general_chat", message: askDate, status: "sent" });
    return { success: true, action: "general_chat", replyMessage: askDate, customer };
  }

  // 5. General Concierge Chat Fallback
  const reply = [
    `*PROPERLY LUXURY REAL ESTATE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Hello *${customerName}*, I am your WhatsApp Property Concierge.`,
    ``,
    `How can we assist you today?`,
    `• View upcoming tours: Reply *STATUS*`,
    `• View your shortlisted properties: Reply *SHORTLIST*`,
    `• Book a new private tour: Reply *BOOK* or *BOOK #[number]*`,
    `• Cancel an appointment: Reply *CANCEL* or *CANCEL #[ID]*`,
    `• Reschedule an appointment: Reply *RESCHEDULE* or *RESCHEDULE #[ID]*`,
    `• Speak with your private agent: Reply *AGENT*`,
  ].join("\n");

  await dbFeature.logWhatsAppMessage({
    phone: rawFrom,
    senderName: customerName,
    customerAccountId: customer?.id,
    direction: "incoming",
    messageType: "general_chat",
    message: text,
    status: "received",
    parsedAction: "general",
    rawPayload: JSON.stringify(payload),
  });

  await dbFeature.logWhatsAppMessage({
    phone: rawFrom,
    senderName: "Properly Concierge Bot",
    customerAccountId: customer?.id,
    direction: "outgoing",
    messageType: "general_chat",
    message: reply,
    status: "sent",
  });

  return {
    success: true,
    action: "general_chat",
    replyMessage: reply,
    customer,
  };
}

/**
 * Dispatch booking confirmation when a user schedules on the site
 */
export async function sendViewingConfirmation(
  viewing: PropertyViewing,
  customerAccount?: CustomerAccount
): Promise<void> {
  const customerName = customerAccount?.name || viewing.agentName || "VIP Guest";
  const customerPhone = customerAccount?.phone || "+60 12-882 1099";

  const message = formatViewingConfirmation(viewing, customerName);

  await dbFeature.logWhatsAppMessage({
    phone: customerPhone,
    senderName: "Properly Concierge Bot",
    viewingId: viewing.id,
    customerAccountId: customerAccount?.id,
    direction: "outgoing",
    messageType: "booking_confirmation",
    message,
    status: "delivered",
    parsedAction: "confirm_viewing",
  });

  // Dispatch live WhatsApp message & .ics calendar invite to customer phone if real device is linked
  try {
    const { sendLiveWhatsAppMessage, sendViewingCalendarInvite } = await import("./whatsappBaileys");
    await sendLiveWhatsAppMessage(customerPhone, message);
    await sendViewingCalendarInvite(viewing, customerAccount);
  } catch (err) {
    // Continue gracefully if Baileys is not active
  }
}

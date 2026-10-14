import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { getDb } from "./db";
import { propertyViewings, users } from "../drizzle/schema";
import { and, eq, ne } from "drizzle-orm";

export interface SlotAvailabilityResult {
  available: boolean;
  reason?: string;
  conflictType?: "local_viewing" | "google_calendar" | "invalid_time";
  conflictSummary?: string;
}

export interface DaySlotStatus {
  timeSlot: string;
  available: boolean;
  reason?: string;
  conflictType?: "local_viewing" | "google_calendar";
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

// ── Standard Default Candidate Viewing Slots ────────────────────────────────
export const STANDARD_VIEWING_SLOTS = [
  "10:00 AM - 11:30 AM",
  "12:00 PM - 01:30 PM",
  "02:30 PM - 04:00 PM",
  "04:30 PM - 06:00 PM",
  "07:00 PM - 08:30 PM",
];

// Fallback agent emails directory matching emailService
const AGENT_EMAIL_DIRECTORY: Record<string, string> = {
  darryl: process.env.GOOGLE_CALENDAR_ID || "darrylraushansingh@gmail.com",
  hannah: "hannah@properly.my",
  amir: "amir@properly.my",
  chloe: "chloe@properly.my",
};

/**
 * Resolve the real email address for an agent from DB or fallback directory
 */
export async function resolveAgentEmail(agentId: string): Promise<string> {
  const normalized = agentId.toLowerCase().trim();
  try {
    const db = await getDb();
    if (db) {
      const userList = await db.select().from(users);
      const match = userList.find(
        (u) =>
          u.agentCode?.toLowerCase() === normalized ||
          (u.role === "agent" && (u.name?.toLowerCase().includes(normalized) ?? false))
      );
      if (match?.email) return match.email;
    }
  } catch (err) {
    console.warn("[GoogleCalendar] Failed to query users table for agent email:", err);
  }
  return AGENT_EMAIL_DIRECTORY[normalized] || process.env.GOOGLE_CALENDAR_ID || "darrylraushansingh@gmail.com";
}

/**
 * Parse a date string and timeSlot into start and end Date objects in Asia/Kuala_Lumpur (UTC+8).
 * Supports formats like "YYYY-MM-DD", "DD MMM YYYY", and time slots like "10:00 AM - 11:30 AM" or "2:30 PM".
 */
export function parseSlotTimeRange(
  dateStr: string,
  timeSlotStr: string
): { startDate: Date; endDate: Date; startIso: string; endIso: string } {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  // Try parsing YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    // Try native Date parse
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  let startHour = 10,
    startMinute = 0,
    endHour = 11,
    endMinute = 30;

  const timeMatches = timeSlotStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);

  if (timeMatches && timeMatches.length > 0) {
    const parseSingle = (str: string) => {
      const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return { hour: 10, minute: 0 };
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const meridiem = m[3] ? m[3].toLowerCase() : h >= 8 && h <= 11 ? "am" : "pm";
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      return { hour: h, minute: min };
    };

    const s = parseSingle(timeMatches[0]);
    startHour = s.hour;
    startMinute = s.minute;

    if (timeMatches.length > 1) {
      const e = parseSingle(timeMatches[1]);
      endHour = e.hour;
      endMinute = e.minute;
    } else {
      endHour = (startHour + 1) % 24;
      endMinute = startMinute + 30;
      if (endMinute >= 60) {
        endHour = (endHour + 1) % 24;
        endMinute -= 60;
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  // Construct ISO 8601 with Malaysia timezone (+08:00)
  const startIso = `${year}-${pad(month)}-${pad(day)}T${pad(startHour)}:${pad(startMinute)}:00+08:00`;
  const endIso = `${year}-${pad(month)}-${pad(day)}T${pad(endHour)}:${pad(endMinute)}:00+08:00`;

  return {
    startDate: new Date(startIso),
    endDate: new Date(endIso),
    startIso,
    endIso,
  };
}

// ── Google Calendar Auth Client Singleton ───────────────────────────────────
let _calendarClient: any = null;
let _serviceAccountEmail: string | null = null;
let _authLoaded = false;

function getServiceAccountCredentialsPath(): string | null {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const p = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(p)) return p;
  }
  const defaultPath = path.resolve(process.cwd(), "google-service-account.json");
  if (fs.existsSync(defaultPath)) return defaultPath;
  return null;
}

export function initializeGoogleCalendar() {
  if (_authLoaded) return _calendarClient;
  _authLoaded = true;

  try {
    let auth: any = null;

    // 1. Raw JSON in environment variable
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      let rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim();
      if (rawJson.startsWith("{")) {
        const credentials = JSON.parse(rawJson);
        _serviceAccountEmail = credentials.client_email;
        auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });
      }
    }

    // 2. Local JSON file (google-service-account.json) — use JWT directly (same as env path)
    if (!auth) {
      const keyFilePath = getServiceAccountCredentialsPath();
      if (keyFilePath) {
        const content = JSON.parse(fs.readFileSync(keyFilePath, "utf8"));
        _serviceAccountEmail = content.client_email;
        auth = new google.auth.JWT({
          email: content.client_email,
          key: content.private_key,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });
      }
    }

    if (auth) {
      _calendarClient = google.calendar({ version: "v3", auth });
      console.log(`[GoogleCalendar] Authenticated with Service Account: ${_serviceAccountEmail}`);
    } else {
      console.log(
        "[GoogleCalendar] No google-service-account.json or GOOGLE_SERVICE_ACCOUNT_KEY found. Google Calendar 2-way sync operating in local double-booking enforcement mode."
      );
    }
  } catch (err: any) {
    console.warn("[GoogleCalendar] Failed to initialize Google Calendar client:", err.message);
    _calendarClient = null;
  }

  return _calendarClient;
}

/**
 * Get current Google Calendar integration status for UI & health checks
 */
export function getGoogleCalendarStatus() {
  const credPath = getServiceAccountCredentialsPath();
  const isKeyEnvSet = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return {
    isConfigured: Boolean(_calendarClient),
    serviceAccountEmail: _serviceAccountEmail,
    credentialsSource: credPath ? "file" : isKeyEnvSet ? "env" : "none",
    credentialsFile: credPath ? path.basename(credPath) : null,
    defaultAgentEmail: AGENT_EMAIL_DIRECTORY["darryl"],
    timeZone: "Asia/Kuala_Lumpur",
  };
}

/**
 * ── DOUBLE-BOOKING CHECK ──────────────────────────────────────────────────
 * Checks both:
 * 1. Local SQLite viewings for the agent (strict: Confirmed / Pending)
 * 2. Real Google Calendar freebusy / events list for the agent
 */
export async function checkSlotAvailability(params: {
  agentId: string;
  agentEmail?: string;
  date: string;
  timeSlot: string;
  excludeViewingId?: number;
}): Promise<SlotAvailabilityResult> {
  const { agentId, date, timeSlot, excludeViewingId } = params;
  const agentEmail = params.agentEmail || (await resolveAgentEmail(agentId));
  const { startDate, endDate, startIso, endIso } = parseSlotTimeRange(date, timeSlot);

  // 1. Check Local SQLite Viewings
  try {
    const db = await getDb();
    if (db) {
      const activeRows = await db
        .select()
        .from(propertyViewings)
        .where(
          and(
            eq(propertyViewings.agentId, agentId),
            eq(propertyViewings.date, date),
            ne(propertyViewings.status, "Cancelled")
          )
        );

      for (const row of activeRows) {
        if (excludeViewingId && row.id === excludeViewingId) continue;

        // Check exact slot match or overlapping window
        if (row.timeSlot === timeSlot) {
          return {
            available: false,
            conflictType: "local_viewing",
            reason: `Agent already has a confirmed viewing booked for "${row.propertyTitle}" during ${timeSlot}.`,
            conflictSummary: row.propertyTitle,
          };
        }

        // Overlapping hour check
        const rowRange = parseSlotTimeRange(row.date, row.timeSlot);
        if (startDate < rowRange.endDate && endDate > rowRange.startDate) {
          return {
            available: false,
            conflictType: "local_viewing",
            reason: `Conflicts with existing viewing for "${row.propertyTitle}" (${row.timeSlot}).`,
            conflictSummary: row.propertyTitle,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[GoogleCalendar] Local DB conflict check warning:", err.message);
  }

  // 2. Check Google Calendar API (if service account is connected)
  const calendar = initializeGoogleCalendar();
  if (calendar && agentEmail) {
    try {
      // Determine the calendar ID to query (agent's primary calendar if shared, or process.env.GOOGLE_CALENDAR_ID)
      const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || agentEmail;

      const eventsRes = await calendar.events.list({
        calendarId: targetCalendarId,
        timeMin: startIso,
        timeMax: endIso,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = eventsRes.data.items || [];
      const conflicts = events.filter((e: any) => {
        // Ignore cancelled events
        if (e.status === "cancelled") return false;
        // Ignore the viewing itself if we are rescheduling an existing synced event
        if (excludeViewingId && e.description?.includes(`Viewing #${excludeViewingId}`)) return false;
        return true;
      });

      if (conflicts.length > 0) {
        const topConflict = conflicts[0];
        const conflictTitle = topConflict.summary || "Existing Google Calendar Commitment";
        return {
          available: false,
          conflictType: "google_calendar",
          reason: `Agent has a Google Calendar event scheduled during this time: "${conflictTitle}".`,
          conflictSummary: conflictTitle,
        };
      }
    } catch (err: any) {
      // If calendar sharing is pending or permissions are still propagating, log and allow gracefully
      console.warn(`[GoogleCalendar] Warning querying Google Calendar for ${agentEmail}:`, err.message);
    }
  }

  return { available: true };
}

/**
 * Get full day availability for an agent across candidate slots
 */
export async function getDayAvailability(params: {
  agentId: string;
  agentEmail?: string;
  date: string;
  candidateSlots?: string[];
  excludeViewingId?: number;
}): Promise<DaySlotStatus[]> {
  const candidateSlots = params.candidateSlots || STANDARD_VIEWING_SLOTS;
  const results: DaySlotStatus[] = [];

  for (const slot of candidateSlots) {
    const check = await checkSlotAvailability({
      agentId: params.agentId,
      agentEmail: params.agentEmail,
      date: params.date,
      timeSlot: slot,
      excludeViewingId: params.excludeViewingId,
    });

    results.push({
      timeSlot: slot,
      available: check.available,
      reason: check.reason,
      conflictType: check.conflictType === "invalid_time" ? undefined : check.conflictType,
    });
  }

  return results;
}

/**
 * ── INSERT EVENT INTO GOOGLE CALENDAR ──────────────────────────────────────
 */
export async function createGoogleCalendarEvent(params: {
  viewing: {
    id: number;
    propertyTitle: string;
    propertyLocation?: string | null;
    propertyPrice?: number | null;
    agentId: string;
    agentName: string;
    agentPhone: string;
    date: string;
    timeSlot: string;
    notes?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  agentEmail?: string;
}): Promise<CalendarSyncResult> {
  const calendar = initializeGoogleCalendar();
  if (!calendar) {
    return {
      success: false,
      error: "Google Calendar service account not configured. Local booking recorded.",
    };
  }

  const { viewing, customer } = params;
  const agentEmail = params.agentEmail || (await resolveAgentEmail(viewing.agentId));
  const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || agentEmail;
  const { startIso, endIso } = parseSlotTimeRange(viewing.date, viewing.timeSlot);

  const priceFormatted = viewing.propertyPrice
    ? `RM ${Number(viewing.propertyPrice).toLocaleString()}`
    : "Price on request";

  const description = [
    `🏢 VIP PROPERTY TOUR (Viewing #${viewing.id})`,
    `Property: ${viewing.propertyTitle}`,
    `Location: ${viewing.propertyLocation || "Kuala Lumpur, Malaysia"}`,
    `Listing Value: ${priceFormatted}`,
    ``,
    `👤 CLIENT PROFILE`,
    `Name: ${customer.name}`,
    `Mobile: ${customer.phone || "Not provided"}`,
    `Email: ${customer.email || "Not provided"}`,
    ``,
    `👔 APPOINTED SPECIALIST`,
    `Agent: ${viewing.agentName} (${viewing.agentPhone})`,
    `Email: ${agentEmail}`,
    ``,
    viewing.notes ? `📝 CLIENT / TOUR NOTES:\n${viewing.notes}\n` : "",
    `Synchronized live via Properly Sales CRM & Concierge Bot.`,
  ]
    .filter(Boolean)
    .join("\n");

  const requestBody: any = {
    summary: `VIP Viewing: ${viewing.propertyTitle} — ${customer.name}`,
    location: viewing.propertyLocation || "Kuala Lumpur, Malaysia",
    description,
    start: {
      dateTime: startIso,
      timeZone: "Asia/Kuala_Lumpur",
    },
    end: {
      dateTime: endIso,
      timeZone: "Asia/Kuala_Lumpur",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 24 * 60 }, // 24 hours before
        { method: "popup", minutes: 2 * 60 },  // 2 hours before
        { method: "email", minutes: 24 * 60 }, // 24 hours before
      ],
    },
    extendedProperties: {
      private: {
        viewingId: String(viewing.id),
        propertyTitle: viewing.propertyTitle,
        agentId: viewing.agentId,
        customerName: customer.name,
        source: "properly_sales_system",
      },
    },
  };

  // Google API Rule: Service accounts writing to personal @gmail.com or un-delegated calendars
  // CANNOT invite attendees without Google Workspace Domain-Wide Delegation.
  // The attendee and agent contact info is already embedded in the rich description.
  // Only add attendees if NOT writing to a standard @gmail.com calendar.
  if (!targetCalendarId.toLowerCase().endsWith("@gmail.com")) {
    const attendees: { email: string; displayName?: string }[] = [];
    if (agentEmail) {
      attendees.push({ email: agentEmail, displayName: viewing.agentName });
    }
    if (customer.email && customer.email.includes("@")) {
      attendees.push({ email: customer.email, displayName: customer.name });
    }
    if (attendees.length > 0) {
      requestBody.attendees = attendees;
    }
  }

  try {
    let res;
    try {
      res = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody,
      });
    } catch (insertErr: any) {
      // If domain-wide delegation failed due to attendees, retry without attendees
      if (
        requestBody.attendees &&
        (insertErr.message?.includes("Domain-Wide Delegation") ||
          insertErr.message?.includes("Service accounts cannot invite attendees"))
      ) {
        console.warn(
          `[GoogleCalendar] Service account cannot invite attendees on ${targetCalendarId}. Retrying without attendees...`
        );
        delete requestBody.attendees;
        res = await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody,
        });
      } else {
        throw insertErr;
      }
    }

    console.log(
      `[GoogleCalendar] Successfully created event ${res.data.id} on ${targetCalendarId} for Viewing #${viewing.id}`
    );

    return {
      success: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink || undefined,
    };
  } catch (err: any) {
    console.error(`[GoogleCalendar] Error inserting event on ${targetCalendarId}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * ── UPDATE / RESCHEDULE EVENT ON GOOGLE CALENDAR ───────────────────────────
 */
export async function updateGoogleCalendarEvent(params: {
  eventId: string;
  agentId: string;
  agentEmail?: string;
  newDate: string;
  newTimeSlot: string;
  notes?: string;
}): Promise<CalendarSyncResult> {
  const calendar = initializeGoogleCalendar();
  if (!calendar) return { success: false, error: "Calendar client not configured" };

  const { eventId, agentId, newDate, newTimeSlot } = params;
  const agentEmail = params.agentEmail || (await resolveAgentEmail(agentId));
  const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || agentEmail;
  const { startIso, endIso } = parseSlotTimeRange(newDate, newTimeSlot);

  try {
    const res = await calendar.events.patch({
      calendarId: targetCalendarId,
      eventId,
      requestBody: {
        start: { dateTime: startIso, timeZone: "Asia/Kuala_Lumpur" },
        end: { dateTime: endIso, timeZone: "Asia/Kuala_Lumpur" },
        ...(params.notes ? { description: params.notes } : {}),
      },
    });

    console.log(`[GoogleCalendar] Updated event ${eventId} on ${targetCalendarId} to ${newDate} (${newTimeSlot})`);
    return {
      success: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink || undefined,
    };
  } catch (err: any) {
    console.warn(`[GoogleCalendar] Error patching event ${eventId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * ── DELETE / CANCEL EVENT ON GOOGLE CALENDAR ──────────────────────────────
 */
export async function deleteGoogleCalendarEvent(params: {
  eventId: string;
  agentId: string;
  agentEmail?: string;
}): Promise<boolean> {
  const calendar = initializeGoogleCalendar();
  if (!calendar) return false;

  const { eventId, agentId } = params;
  const agentEmail = params.agentEmail || (await resolveAgentEmail(agentId));
  const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || agentEmail;

  try {
    await calendar.events.delete({
      calendarId: targetCalendarId,
      eventId,
    });
    console.log(`[GoogleCalendar] Deleted event ${eventId} on ${targetCalendarId}`);
    return true;
  } catch (err: any) {
    console.warn(`[GoogleCalendar] Error deleting event ${eventId}:`, err.message);
    return false;
  }
}

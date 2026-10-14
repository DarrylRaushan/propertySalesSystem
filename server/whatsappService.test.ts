import { describe, it, expect, afterAll } from "vitest";
import {
  formatViewingConfirmation,
  formatCancellationConfirmation,
  handleIncomingWhatsAppMessage,
  normalizeWhatsAppText,
  parseFlexibleWhatsAppDate,
} from "./whatsappService";
import * as dbFeature from "./db-feature";
import { getDb } from "./db";
import { propertyViewings } from "../drizzle/schema";
import { inArray } from "drizzle-orm";

describe("WhatsApp Service & Direct Cancellation Engine", { timeout: 15000 }, () => {
  const createdViewingIds: number[] = [];

  afterAll(async () => {
    if (createdViewingIds.length > 0) {
      const db = await getDb();
      if (db) {
        await db
          .delete(propertyViewings)
          .where(inArray(propertyViewings.id, createdViewingIds));
      }
    }
  });

  it("formats luxury VIP viewing confirmation with cancellation instructions", () => {
    const mockViewing: any = {
      id: 101,
      propertyTitle: "Pavilion Damansara Heights Sky Residence",
      propertyLocation: "Damansara Heights, Kuala Lumpur",
      propertyPrice: 2850000,
      agentName: "Hannah Cheong",
      agentPhone: "+60 12-384 9201",
      date: "2026-09-20",
      timeSlot: "11:00 AM - 12:00 PM",
      status: "Confirmed",
    };

    const text = formatViewingConfirmation(mockViewing, "Sarah Tan");
    expect(text).toContain("VIP Private Tour Confirmed");
    expect(text).toContain("Sarah Tan");
    expect(text).toContain("Pavilion Damansara Heights Sky Residence");
    expect(text).toContain("Hannah Cheong");
    expect(text).toContain("CANCEL #101");
  });

  it("formats cancellation confirmation accurately", () => {
    const mockViewing: any = {
      id: 101,
      propertyTitle: "Pavilion Damansara Heights Sky Residence",
      agentName: "Hannah Cheong",
      date: "2026-09-20",
      timeSlot: "11:00 AM - 12:00 PM",
    };

    const text = formatCancellationConfirmation(mockViewing, "Sarah Tan");
    expect(text).toContain("TOUR CANCELLED");
    expect(text).toContain("successfully cancelled");
    expect(text).toContain("Hannah Cheong");
  });

  it("handles incoming WhatsApp message with 'CANCEL #id' command", async () => {
    // 1. Create a viewing in DB
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 1,
      propertyTitle: "The Conlay Signature Suites",
      propertyLocation: "KLCC, Kuala Lumpur",
      propertyPrice: 2100000,
      agentId: "hannah",
      agentName: "Hannah Cheong",
      agentPhone: "+60 12-384 9201",
      date: "2026-09-22",
      timeSlot: "02:30 PM - 03:30 PM",
      status: "Confirmed",
    });

    expect(viewing.id).toBeDefined();
    createdViewingIds.push(viewing.id);

    // 2. Simulate incoming WhatsApp cancel message
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: `Please cancel my appointment #${viewing.id}`,
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("viewing_cancelled");
    expect(result.replyMessage).toContain("TOUR CANCELLED");

    // 3. Verify in DB that status is now Cancelled and cancelledVia is whatsapp
    const updated = await dbFeature.getViewingById(viewing.id);
    expect(updated?.status).toBe("Cancelled");
    expect(updated?.cancelledVia).toBe("whatsapp");
  });

  it("handles incoming general cancellation text ('cannot make it')", async () => {
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 2,
      propertyTitle: "8 Conlay Kempinski Branded Residences",
      propertyLocation: "Bukit Bintang, Kuala Lumpur",
      propertyPrice: 3450000,
      agentId: "amir",
      agentName: "Amir Rahman",
      agentPhone: "+60 17-291 8832",
      date: "2026-09-25",
      timeSlot: "11:00 AM - 12:00 PM",
      status: "Confirmed",
    });

    expect(viewing.id).toBeDefined();
    createdViewingIds.push(viewing.id);

    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "Sorry Amir, I cannot make it for my 8 Conlay tour tomorrow",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("viewing_cancelled");
    expect(result.viewing).toBeDefined();

    const updated = await dbFeature.getViewingById(result.viewing!.id);
    expect(updated?.status).toBe("Cancelled");
    expect(updated?.cancelledVia).toBe("whatsapp");
  });

  it("responds to STATUS query with upcoming bookings", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "STATUS",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("status_query");
    expect(result.replyMessage).toContain("PROPERLY LUXURY REAL ESTATE");
  });

  it("responds to natural language queries like 'whats the one i have scheduled now'", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "whats the one i have scheduled now",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("status_query");
    expect(result.replyMessage).toContain("PROPERLY LUXURY REAL ESTATE");
    expect(result.replyMessage).toContain("Private Tour");
  });

  it("responds to agent queries like 'who is my agent'", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "who is my agent",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("general_chat");
    expect(result.replyMessage).toContain("Dedicated Luxury Specialist Contact");
  });

  it("normalizes slang, abbreviations, and Malaysian colloquialisms accurately", () => {
    const t1 = normalizeWhatsAppText("wanna cncl la");
    expect(t1.normalized).toContain("cancel");

    const t2 = normalizeWhatsAppText("cncl #15");
    expect(t2.extractedId).toBe(15);
    expect(t2.normalized).toContain("cancel");

    const t3 = normalizeWhatsAppText("resched #7");
    expect(t3.extractedId).toBe(7);
    expect(t3.normalized).toContain("reschedule");

    const t4 = normalizeWhatsAppText("check my appt bro");
    expect(t4.normalized).toContain("appointment");

    const t5 = normalizeWhatsAppText("shrtlist");
    expect(t5.normalized).toContain("shortlist");

    const t6 = normalizeWhatsAppText("bk 2");
    expect(t6.extractedItemNumber).toBe(2);
    expect(t6.normalized).toContain("book");

    const t7 = normalizeWhatsAppText("tak jadi la boss");
    expect(t7.normalized).toContain("cancel");

    const t8 = normalizeWhatsAppText("tukar tarikh boleh?");
    expect(t8.normalized).toContain("reschedule");

    const t9 = normalizeWhatsAppText("talk to human");
    expect(t9.normalized).toContain("agent");

    // Test flexible date parsing
    const ref = new Date("2026-10-20T12:00:00Z");
    const d1 = parseFlexibleWhatsAppDate("tomorrow", ref);
    expect(d1).toContain("21 Oct 2026");

    const d2 = parseFlexibleWhatsAppDate("25 Oct", ref);
    expect(d2).toContain("25 Oct 2026");

    const d3 = parseFlexibleWhatsAppDate("2026-11-05", ref);
    expect(d3).toContain("05 Nov 2026");
  });

  it("handles conversational slang message 'check my appt'", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "check my appt",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("status_query");
    expect(result.replyMessage).toContain("PROPERLY LUXURY REAL ESTATE");
  });

  it("handles abbreviation 'shrtlist'", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "shrtlist",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("general_chat");
  });

  it("handles casual human agent query 'talk to human'", async () => {
    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "talk to human please",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("general_chat");
    expect(result.replyMessage).toContain("Dedicated Luxury Specialist Contact");
  });

  it("cancels booking with slang phrase 'wanna cncl #id la'", async () => {
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 3,
      propertyTitle: "The Ritz-Carlton Residences",
      propertyLocation: "Jalan Ampang, KLCC",
      propertyPrice: 4200000,
      agentId: "hannah",
      agentName: "Hannah Cheong",
      agentPhone: "+60 12-384 9201",
      date: "2026-10-15",
      timeSlot: "03:00 PM - 04:00 PM",
      status: "Confirmed",
    });

    createdViewingIds.push(viewing.id);

    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: `wanna cncl #${viewing.id} la bro`,
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("viewing_cancelled");
    expect(result.replyMessage).toContain("TOUR CANCELLED");

    const updated = await dbFeature.getViewingById(viewing.id);
    expect(updated?.status).toBe("Cancelled");
  });

  it("handles slang 'resched' and accepts 'tomorrow' as flexible date", async () => {
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 4,
      propertyTitle: "Serai Saujana Luxury Villa",
      propertyLocation: "Saujana, Selangor",
      propertyPrice: 5100000,
      agentId: "amir",
      agentName: "Amir Rahman",
      agentPhone: "+60 17-291 8832",
      date: "2026-10-18",
      timeSlot: "10:00 AM - 11:00 AM",
      status: "Confirmed",
    });

    createdViewingIds.push(viewing.id);

    // Step 1: initiate reschedule using slang 'resched'
    const step1 = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: `resched #${viewing.id}`,
      senderName: "Sarah Tan",
    });

    expect(step1.success).toBe(true);
    expect(step1.replyMessage).toContain("Choose a 1-Tap Quick Slot:");

    // Step 2: reply with natural language date "tomorrow"
    const step2 = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "tomorrow",
      senderName: "Sarah Tan",
    });

    expect(step2.success).toBe(true);
    expect(step2.replyMessage).toContain("New date noted:");
    expect(step2.replyMessage).toContain("What time would you prefer?");

    // Step 3: reply with time slot to complete
    const step3 = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "2:00 PM",
      senderName: "Sarah Tan",
    });

    expect(step3.success).toBe(true);
    expect(step3.action).toBe("viewing_rescheduled");
    expect(step3.replyMessage).toContain("TOUR RESCHEDULED");

    const updated = await dbFeature.getViewingById(viewing.id);
    expect(updated?.timeSlot).toBe("2:00 PM");
  });

  it("handles 1-tap quick slot reschedule in a single reply", async () => {
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 3,
      propertyTitle: "The Astaka Grand Penthouse",
      propertyLocation: "One Bukit Senyum, Johor Bahru",
      propertyPrice: 4200000,
      agentId: "darryl",
      agentName: "Darryl Raushan",
      agentPhone: "+60 17-291 8832",
      date: "2026-10-20",
      timeSlot: "11:00 AM - 12:00 PM",
      status: "Confirmed",
    });

    createdViewingIds.push(viewing.id);

    // Step 1: initiate reschedule
    const step1 = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: `reschedule #${viewing.id}`,
      senderName: "Sarah Tan",
    });

    expect(step1.success).toBe(true);
    expect(step1.replyMessage).toContain("1️⃣ Reply *1*");

    // Step 2: 1-Tap pick Option 1 directly!
    const step2 = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "1",
      senderName: "Sarah Tan",
    });

    expect(step2.success).toBe(true);
    expect(step2.action).toBe("viewing_rescheduled");
    expect(step2.replyMessage).toContain("TOUR RESCHEDULED");
    expect(step2.replyMessage).toContain("11:00 AM - 12:00 PM");

    const updated = await dbFeature.getViewingById(viewing.id);
    expect(updated?.timeSlot).toBe("11:00 AM - 12:00 PM");
  });

  it("generates RFC 5545 valid .ics calendar invite content with VALARM reminder", async () => {
    const { generateViewingIcs } = await import("./whatsappService");
    const ics = generateViewingIcs(
      {
        id: 999,
        propertyTitle: "Pavilion Damansara Heights Sky Villa",
        propertyLocation: "Damansara Heights, Kuala Lumpur",
        date: "2026-10-15",
        timeSlot: "02:30 PM - 03:30 PM",
        agentName: "Hannah Cheong",
        agentPhone: "+60 12-384 9201",
      },
      "Sarah Tan",
      "sarah.tan@gmail.com"
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Properly Luxury Real Estate//Property Tour Concierge//EN");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:🏛️ VIP Private Tour: Pavilion Damansara Heights Sky Villa");
    expect(ics).toContain("LOCATION:Damansara Heights, Kuala Lumpur");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics).toContain("DTSTART;TZID=Asia/Kuala_Lumpur:20261015T143000");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("handles CALENDAR intent over WhatsApp and returns ICS dispatch message", async () => {
    const account = await dbFeature.findCustomerAccountByEmail("sarah.tan@gmail.com");
    if (!account) return;

    const viewing = await dbFeature.createViewing({
      customerAccountId: account.id,
      propertyId: 2,
      propertyTitle: "Aira Residence Luxury Condo",
      propertyLocation: "Damansara Heights, Kuala Lumpur",
      propertyPrice: 3500000,
      agentId: "hannah",
      agentName: "Hannah Cheong",
      agentPhone: "+60 12-384 9201",
      date: "2026-11-05",
      timeSlot: "10:00 AM - 11:00 AM",
      status: "Confirmed",
    });

    createdViewingIds.push(viewing.id);

    const result = await handleIncomingWhatsAppMessage({
      from: "+60 12-882 1099",
      body: "calendar invite",
      senderName: "Sarah Tan",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("calendar_invite");
    expect(result.replyMessage).toContain("VIP TOUR CALENDAR INVITE (.ICS)");
    expect(result.replyMessage).toContain("Tap the file to add directly to Apple Calendar, Google Calendar, or Outlook");
  });
});

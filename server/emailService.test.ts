import { describe, it, expect } from "vitest";
import {
  getAgentEmail,
  buildGoogleCalendarUrl,
  notifyViewingRescheduled,
  notifyViewingBooked,
} from "./emailService";

describe("EmailService & Google Calendar Integration", () => {
  it("resolves Darryl agent's real email address", async () => {
    const email = await getAgentEmail("darryl");
    expect(["darrylraushansingh@gmail.com", "bertbob944@gmail.com"]).toContain(email);
  });

  it("builds a valid 1-tap Google Calendar web link", () => {
    const gcalUrl = buildGoogleCalendarUrl({
      title: "Pavilion Damansara Heights",
      location: "Damansara Heights, Kuala Lumpur",
      description: "VIP Private Tour with specialist Darryl",
      date: "2026-10-20",
      timeSlot: "11:00 AM - 12:00 PM",
    });

    expect(gcalUrl).toContain("https://calendar.google.com/calendar/render");
    expect(gcalUrl).toContain("action=TEMPLATE");
    expect(gcalUrl).toContain("Pavilion+Damansara+Heights");
    expect(gcalUrl).toContain("20261020T110000");
  });

  it("dispatches reschedule email alert to agent (bertbob944@gmail.com) and client (darrylraushansingh@gmail.com)", async () => {
    const result = await notifyViewingRescheduled({
      viewing: {
        id: 42,
        propertyTitle: "8 Conlay Kempinski Branded Residences",
        propertyLocation: "KLCC, Kuala Lumpur",
        propertyPrice: 3200000,
        agentId: "darryl",
        agentName: "Darryl Raushan",
        agentPhone: "+60183865414",
        date: "2026-10-25",
        timeSlot: "02:30 PM - 03:30 PM",
        notes: "Interested in high-floor units",
      },
      customer: {
        id: 4,
        name: "Darryl Raushan Singh",
        email: "darrylraushansingh@gmail.com",
        phone: "+60183865414",
      },
      oldDate: "2026-10-22",
      oldSlot: "11:00 AM - 12:00 PM",
      source: "whatsapp_bot",
    });

    expect(result.agentResult.sent).toBe(true);
    expect(result.customerResult.sent).toBe(true);
    expect(result.googleCalendarUrl).toContain("calendar.google.com");
  });

  it("dispatches booking email confirmation with .ics attachment and Google Calendar link", async () => {
    const result = await notifyViewingBooked({
      viewing: {
        id: 43,
        propertyTitle: "The Astaka Super Luxury Penthouse",
        propertyLocation: "Johor Bahru",
        propertyPrice: 6500000,
        agentId: "darryl",
        agentName: "Darryl Raushan",
        agentPhone: "+60183865414",
        date: "2026-11-01",
        timeSlot: "11:00 AM - 12:00 PM",
      },
      customer: {
        id: 4,
        name: "Darryl Raushan Singh",
        email: "darrylraushansingh@gmail.com",
        phone: "+60183865414",
      },
    });

    expect(result.agentResult.sent).toBe(true);
    expect(result.customerResult.sent).toBe(true);
    expect(result.googleCalendarUrl).toContain("20261101T110000");
  });
});

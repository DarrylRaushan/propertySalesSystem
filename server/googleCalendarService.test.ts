import { describe, it, expect } from "vitest";
import {
  parseSlotTimeRange,
  checkSlotAvailability,
  getDayAvailability,
  getGoogleCalendarStatus,
  STANDARD_VIEWING_SLOTS,
} from "./googleCalendarService";

describe("Google Calendar Integration & Double-Booking Prevention", () => {
  it("correctly parses date and time slots into Malaysian timezone (+08:00)", () => {
    const { startIso, endIso, startDate, endDate } = parseSlotTimeRange(
      "2026-10-15",
      "10:00 AM - 11:30 AM"
    );

    expect(startIso).toContain("2026-10-15T10:00:00+08:00");
    expect(endIso).toContain("2026-10-15T11:30:00+08:00");
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  });

  it("handles afternoon meridiem time strings properly", () => {
    const { startIso, endIso } = parseSlotTimeRange(
      "2026-10-20",
      "02:30 PM - 03:30 PM (Afternoon Executive)"
    );

    expect(startIso).toContain("2026-10-20T14:30:00+08:00");
    expect(endIso).toContain("2026-10-20T15:30:00+08:00");
  });

  it("returns integration status without throwing", () => {
    const status = getGoogleCalendarStatus();
    expect(status).toHaveProperty("isConfigured");
    expect(status.timeZone).toBe("Asia/Kuala_Lumpur");
    expect(["darrylraushansingh@gmail.com", "bertbob944@gmail.com"]).toContain(status.defaultAgentEmail);
  });

  it("checks candidate slot availability across the day", async () => {
    const daySlots = await getDayAvailability({
      agentId: "darryl",
      date: "2026-11-01",
      candidateSlots: STANDARD_VIEWING_SLOTS,
    });

    expect(daySlots.length).toBe(STANDARD_VIEWING_SLOTS.length);
    for (const slot of daySlots) {
      expect(slot).toHaveProperty("timeSlot");
      expect(slot).toHaveProperty("available");
    }
  });

  it("allows a slot when there are no conflicting bookings", async () => {
    const res = await checkSlotAvailability({
      agentId: "darryl",
      date: "2026-12-31",
      timeSlot: "10:00 AM - 11:30 AM",
    });

    expect(res.available).toBe(true);
  });
});

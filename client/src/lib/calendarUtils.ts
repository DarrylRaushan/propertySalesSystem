const AGENT_CALENDAR_EMAIL = "darrylraushansingh@gmail.com";

export interface GoogleCalendarEventParams {
  title: string;
  location?: string;
  date: string;
  timeSlot: string;
  specialistName?: string;
  specialistPhone?: string;
  notes?: string;
  bookingId?: string | number;
  googleCalendarHtmlLink?: string | null;
  googleCalendarEventId?: string | null;
}

/**
 * Returns the URL to view an event in Google Calendar.
 *
 * Priority:
 * 1. If googleCalendarEventId is available → construct a fresh event URL with the
 *    FULL agent email (avoids the truncated @m suffix in API-returned htmlLinks).
 * 2. If googleCalendarHtmlLink is available → use it directly as a fallback.
 * 3. Final fallback → Google Calendar day view for that date.
 */
export function buildGoogleCalendarUrl(params: GoogleCalendarEventParams): string {
  const { date, googleCalendarHtmlLink, googleCalendarEventId } = params;

  // Parse date
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  const isoMatch = date.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  // 1. Best option: construct fresh EID URL from event ID + full email
  if (googleCalendarEventId && typeof googleCalendarEventId === "string" && googleCalendarEventId.trim().length > 0) {
    try {
      const rawPayload = `${googleCalendarEventId.trim()} ${AGENT_CALENDAR_EMAIL}`;
      const btoaFn = typeof window !== "undefined" && typeof window.btoa === "function"
        ? window.btoa
        : typeof btoa === "function"
        ? btoa
        : null;
      if (btoaFn) {
        const eid = btoaFn(rawPayload).replace(/=+$/, "");
        return `https://www.google.com/calendar/event?eid=${eid}`;
      }
    } catch {
      // fall through
    }
  }

  // 2. Fallback: use the API-returned htmlLink
  if (googleCalendarHtmlLink && typeof googleCalendarHtmlLink === "string" && googleCalendarHtmlLink.trim().length > 0) {
    return googleCalendarHtmlLink.trim();
  }

  // 3. Final fallback: navigate to Google Calendar day view for that date
  return `https://calendar.google.com/calendar/u/0/r/day/${year}/${pad(month)}/${pad(day)}`;
}

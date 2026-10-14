import nodemailer, { type Transporter } from "nodemailer";
import { generateViewingIcs } from "./whatsappService";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

export interface ViewingEmailContext {
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
  status?: string | null;
}

export interface CustomerEmailContext {
  id?: number;
  name: string;
  email: string;
  phone?: string | null;
}

// ── Fallback Agent Emails Directory ──────────────────────────────────────────
// Primary notification email: set AGENT_NOTIFICATION_EMAIL in .env
// (distinct from GOOGLE_CALENDAR_ID which is a calendar identifier, not always an email)
const AGENT_EMAIL_DIRECTORY: Record<string, string> = {
  darryl: process.env.AGENT_NOTIFICATION_EMAIL || process.env.GOOGLE_CALENDAR_ID || "darrylraushansingh@gmail.com",
  hannah: "hannah@properly.my",
  amir: "amir@properly.my",
  chloe: "chloe@properly.my",
};

/**
 * Resolve the real email address for an agent from DB or fallback map
 */
export async function getAgentEmail(agentId: string): Promise<string> {
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
    console.warn("[EmailService] Failed to query user table for agent email:", err);
  }
  return AGENT_EMAIL_DIRECTORY[normalized] || process.env.GOOGLE_CALENDAR_ID || "darrylraushansingh@gmail.com";
}

/**
 * Parse date and timeslot into ISO strings for Google Calendar URL generator
 */
function parseDateTimeRange(dateStr: string, timeSlotStr: string): { startIso: string; endIso: string } {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  const isoMatch = dateStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  let startHour = 11, startMinute = 0, endHour = 12, endMinute = 0;
  const timeMatches = timeSlotStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);

  if (timeMatches && timeMatches.length > 0) {
    const parseTime = (str: string) => {
      const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return { hour: 11, minute: 0 };
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const meridiem = m[3] ? m[3].toLowerCase() : (h >= 8 && h <= 11 ? "am" : "pm");
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      return { hour: h, minute: min };
    };

    const s = parseTime(timeMatches[0]);
    startHour = s.hour;
    startMinute = s.minute;

    if (timeMatches.length > 1) {
      const e = parseTime(timeMatches[1]);
      endHour = e.hour;
      endMinute = e.minute;
    } else {
      // FIXED: add 30-minute buffer and carry over to next hour correctly
      endMinute = startMinute + 30;
      if (endMinute >= 60) {
        endHour = (startHour + 1) % 24;
        endMinute -= 60;
      } else {
        endHour = startHour;
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const startIso = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMinute)}00`;
  const endIso = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;

  return { startIso, endIso };
}

/**
 * Generate a 1-tap Google Calendar web addition link
 */
export function buildGoogleCalendarUrl(params: {
  title: string;
  location?: string;
  description?: string;
  date: string;
  timeSlot: string;
}): string {
  const { startIso, endIso } = parseDateTimeRange(params.date, params.timeSlot);
  const searchParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `VIP Viewing: ${params.title}`,
    dates: `${startIso}/${endIso}`,
    details: params.description || `VIP Property Tour for ${params.title}`,
    location: params.location || "Kuala Lumpur, Malaysia",
  });
  return `https://calendar.google.com/calendar/render?${searchParams.toString()}`;
}

/**
 * Build configured nodemailer transporter or return null if SMTP not defined
 */
function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST || (process.env.SMTP_USER?.includes("@gmail.com") ? "smtp.gmail.com" : undefined);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : (host === "smtp.gmail.com" ? 465 : 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Dispatch an email with an optional .ics calendar invite attachment
 */
async function sendEmailMessage(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  icsContent?: string;
  icsFileName?: string;
}): Promise<{ sent: boolean; mode: "smtp" | "simulated"; messageId?: string }> {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"Properly Luxury Concierge" <concierge@properly.my>';

  const attachments: Array<{ filename: string; content: string; contentType: string }> = [];
  if (options.icsContent) {
    attachments.push({
      filename: options.icsFileName || "invite.ics",
      content: options.icsContent,
      contentType: "text/calendar; charset=utf-8; method=REQUEST",
    });
  }

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments,
        headers: options.icsContent ? {
          "Content-Class": "urn:content-classes:calendarmessage",
        } : undefined,
      });
      console.log(`[EmailService] Live SMTP email delivered to ${options.to} (ID: ${info.messageId})`);
      return { sent: true, mode: "smtp", messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService] SMTP send error to ${options.to}:`, err);
    }
  }

  // Graceful simulated delivery (logged cleanly)
  console.log(`\n============================================================`);
  console.log(`📧 [EmailService: Simulated Dispatch]`);
  console.log(`   To:       ${options.to}`);
  console.log(`   Subject:  ${options.subject}`);
  console.log(`   Calendar: ${options.icsFileName ? `Attached (.ics ${options.icsContent?.length} bytes)` : "None"}`);
  console.log(`   Status:   Queued (Add SMTP_USER & SMTP_PASS in .env for live Gmail/SMTP relay)`);
  console.log(`============================================================\n`);

  return { sent: true, mode: "simulated" };
}

/**
 * Send an alert email to the agent and customer when a viewing is rescheduled
 */
export async function notifyViewingRescheduled(params: {
  viewing: ViewingEmailContext;
  customer: CustomerEmailContext;
  oldDate?: string;
  oldSlot?: string;
  source?: "customer_portal" | "whatsapp_bot" | "crm_agent";
}): Promise<{ agentResult: any; customerResult: any; googleCalendarUrl: string }> {
  const agentEmail = await getAgentEmail(params.viewing.agentId);
  const customerEmail = params.customer.email;
  const customerName = params.customer.name;
  const customerPhone = params.customer.phone || process.env.FALLBACK_CUSTOMER_PHONE || "";
  const phoneLabel = customerPhone ? ` (${customerPhone})` : "";

  const googleCalUrl = buildGoogleCalendarUrl({
    title: params.viewing.propertyTitle,
    location: params.viewing.propertyLocation || "Kuala Lumpur",
    description: `Rescheduled VIP Viewing for ${params.viewing.propertyTitle} with specialist ${params.viewing.agentName}. Client: ${customerName}${phoneLabel}`,
    date: params.viewing.date,
    timeSlot: params.viewing.timeSlot,
  });

  const ics = generateViewingIcs(
    {
      ...params.viewing,
      id: params.viewing.id,
      propertyLocation: params.viewing.propertyLocation || "Kuala Lumpur, Malaysia",
      propertyPrice: params.viewing.propertyPrice ?? undefined,
      notes: params.viewing.notes || null,
    },
    customerName,
    customerEmail
  );

  const cleanTitle = params.viewing.propertyTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  const icsFileName = `VIP_Tour_Rescheduled_${cleanTitle}_${params.viewing.date}.ics`;

  const sourceLabel =
    params.source === "whatsapp_bot"
      ? "WhatsApp 1-Tap Concierge"
      : params.source === "customer_portal"
      ? "Customer VIP Portal"
      : "Agent CRM Action";

  // 1. Agent Notification Email (e.g. to bertbob944@gmail.com)
  const agentSubject = `🔄 [Viewing Rescheduled] ${params.viewing.propertyTitle} — ${customerName}`;
  const agentHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dfe7e3; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #153941 0%, #1e4d4d 100%); padding: 32px 28px; text-align: left; color: #ffffff;">
        <span style="background-color: #d7ef73; color: #153941; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
          Reschedule Alert
        </span>
        <h1 style="margin: 14px 0 6px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
          VIP Tour Rescheduled
        </h1>
        <p style="margin: 0; font-size: 14px; color: #e0f2fe; opacity: 0.9;">
          ${params.viewing.propertyTitle}
        </p>
      </div>

      <!-- Body Content -->
      <div style="padding: 28px; color: #153941;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hello <strong>${params.viewing.agentName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4b635d;">
          Your client <strong>${customerName}</strong> has updated their private tour appointment via <em>${sourceLabel}</em>.
        </p>

        <!-- Appointment Card -->
        <div style="background-color: #f7faf8; border: 1px solid #e2ece7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #718b84; width: 140px;">Property</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${params.viewing.propertyTitle}</td>
            </tr>
            ${params.oldDate ? `
            <tr>
              <td style="padding: 8px 0; color: #a24b4b;">Previous Time</td>
              <td style="padding: 8px 0; color: #a24b4b; text-decoration: line-through;">
                ${params.oldDate} (${params.oldSlot || "Standard slot"})
              </td>
            </tr>` : ""}
            <tr style="border-top: 1px dashed #d1e2db;">
              <td style="padding: 10px 0; color: #1d7350; font-weight: 700;">New Date & Time</td>
              <td style="padding: 10px 0; color: #1d7350; font-weight: 700; font-size: 15px;">
                ${params.viewing.date} (${params.viewing.timeSlot})
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718b84;">Client Name</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718b84;">Client Phone</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${customerPhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718b84;">Client Email</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${customerEmail}</td>
            </tr>
            ${params.viewing.notes ? `
            <tr>
              <td style="padding: 8px 0; color: #718b84;">Notes</td>
              <td style="padding: 8px 0; color: #153941; font-style: italic;">"${params.viewing.notes}"</td>
            </tr>` : ""}
          </table>
        </div>

        <!-- Google Calendar CTA Button -->
        <div style="text-align: center; margin: 30px 0 20px 0;">
          <a href="${googleCalUrl}" target="_blank" style="background-color: #153941; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 8px rgba(21,57,65,0.25);">
            📅 Add Updated Tour to Google Calendar
          </a>
          <p style="font-size: 12px; color: #718b84; margin-top: 10px;">
            An interactive <strong>.ics</strong> invite file has also been attached to this email for 1-click sync.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f6f3; padding: 18px 28px; text-align: center; font-size: 12px; color: #839d96; border-top: 1px solid #dfe7e3;">
        Properly Luxury Real Estate • Automated Agent Notification Service<br />
        Kuala Lumpur, Malaysia
      </div>
    </div>
  `;

  const agentText = `
VIP Tour Rescheduled: ${params.viewing.propertyTitle}
Client: ${customerName} (${customerPhone}, ${customerEmail})
New Date & Slot: ${params.viewing.date} (${params.viewing.timeSlot})
Previous: ${params.oldDate || "N/A"} (${params.oldSlot || "N/A"})
Source: ${sourceLabel}

1-Tap Google Calendar Link:
${googleCalUrl}
  `.trim();

  // 2. Customer Confirmation Email (e.g. to darrylraushansingh@gmail.com)
  const custSubject = `🗓️ Viewing Rescheduled: ${params.viewing.propertyTitle}`;
  const custHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dfe7e3; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #153941 0%, #1e4d4d 100%); padding: 32px 28px; text-align: left; color: #ffffff;">
        <span style="background-color: #d7ef73; color: #153941; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
          Confirmed
        </span>
        <h1 style="margin: 14px 0 6px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
          Your Tour Has Been Rescheduled
        </h1>
        <p style="margin: 0; font-size: 14px; color: #e0f2fe; opacity: 0.9;">
          ${params.viewing.propertyTitle}
        </p>
      </div>

      <div style="padding: 28px; color: #153941;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
          Dear <strong>${customerName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4b635d;">
          Your private VIP viewing appointment has been successfully updated. Your assigned property specialist <strong>${params.viewing.agentName}</strong> has been notified and will have the showroom ready.
        </p>

        <div style="background-color: #f7faf8; border: 1px solid #e2ece7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #718b84; width: 140px;">Property</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${params.viewing.propertyTitle}</td>
            </tr>
            <tr style="border-top: 1px dashed #d1e2db;">
              <td style="padding: 10px 0; color: #1d7350; font-weight: 700;">Confirmed Date</td>
              <td style="padding: 10px 0; color: #1d7350; font-weight: 700; font-size: 15px;">
                ${params.viewing.date} (${params.viewing.timeSlot})
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718b84;">Your Specialist</td>
              <td style="padding: 8px 0; font-weight: 600; color: #153941;">${params.viewing.agentName} (${params.viewing.agentPhone})</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0 20px 0;">
          <a href="${googleCalUrl}" target="_blank" style="background-color: #153941; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block;">
            📅 Update Google Calendar
          </a>
          <p style="font-size: 12px; color: #718b84; margin-top: 10px;">
            Open the attached <strong>.ics</strong> file to update your phone calendar instantly.
          </p>
        </div>
      </div>

      <div style="background-color: #f1f6f3; padding: 18px 28px; text-align: center; font-size: 12px; color: #839d96; border-top: 1px solid #dfe7e3;">
        Properly Luxury Real Estate • Kuala Lumpur, Malaysia
      </div>
    </div>
  `;

  const custText = `
Your VIP Viewing has been rescheduled:
Property: ${params.viewing.propertyTitle}
Date & Time: ${params.viewing.date} (${params.viewing.timeSlot})
Specialist: ${params.viewing.agentName} (${params.viewing.agentPhone})

Add to Google Calendar:
${googleCalUrl}
  `.trim();

  const primaryAlertEmail =
    process.env.NOTIFICATION_EMAIL ||
    process.env.AGENT_NOTIFICATION_EMAIL ||
    process.env.GOOGLE_CALENDAR_ID ||
    "darrylraushansingh@gmail.com";

  // Send to primary notification Gmail, agent, and customer
  const agentTargets: string[] = [];
  if (primaryAlertEmail && !agentTargets.includes(primaryAlertEmail)) agentTargets.push(primaryAlertEmail);
  if (agentEmail && agentEmail.includes("@") && !agentTargets.includes(agentEmail)) agentTargets.push(agentEmail);

  const dispatchPromises: Promise<any>[] = [];
  for (const target of agentTargets) {
    dispatchPromises.push(
      sendEmailMessage({
        to: target,
        subject: agentSubject,
        html: agentHtml,
        text: agentText,
        icsContent: ics,
        icsFileName,
      })
    );
  }

  if (customerEmail && !agentTargets.includes(customerEmail)) {
    dispatchPromises.push(
      sendEmailMessage({
        to: customerEmail,
        subject: custSubject,
        html: custHtml,
        text: custText,
        icsContent: ics,
        icsFileName,
      })
    );
  }

  const results = await Promise.all(dispatchPromises);
  const agentResult = results[0] || { sent: true, mode: "simulated" };
  const customerResult = results[1] || results[0];

  return { agentResult, customerResult, googleCalendarUrl: googleCalUrl };
}

/**
 * Send an email when a new viewing is booked
 */
export async function notifyViewingBooked(params: {
  viewing: ViewingEmailContext;
  customer: CustomerEmailContext;
}): Promise<{ agentResult: any; customerResult: any; googleCalendarUrl: string }> {
  const agentEmail = await getAgentEmail(params.viewing.agentId);
  const customerEmail = params.customer.email;
  const customerName = params.customer.name;
  const customerPhone = params.customer.phone || process.env.FALLBACK_CUSTOMER_PHONE || "";
  const phoneLabel = customerPhone ? ` (${customerPhone})` : "";

  const googleCalUrl = buildGoogleCalendarUrl({
    title: params.viewing.propertyTitle,
    location: params.viewing.propertyLocation || "Kuala Lumpur",
    description: `VIP Tour for ${params.viewing.propertyTitle} with agent ${params.viewing.agentName}. Client: ${customerName}${phoneLabel}`,
    date: params.viewing.date,
    timeSlot: params.viewing.timeSlot,
  });

  const ics = generateViewingIcs(
    {
      ...params.viewing,
      id: params.viewing.id,
      propertyLocation: params.viewing.propertyLocation || "Kuala Lumpur, Malaysia",
      propertyPrice: params.viewing.propertyPrice ?? undefined,
      notes: params.viewing.notes || null,
    },
    customerName,
    customerEmail
  );

  const cleanTitle = params.viewing.propertyTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  const icsFileName = `VIP_Tour_${cleanTitle}_${params.viewing.date}.ics`;

  const agentSubject = `⭐ [New VIP Tour Booked] ${params.viewing.propertyTitle} — ${customerName}`;
  const agentHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dfe7e3; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #153941 0%, #1e4d4d 100%); padding: 32px 28px; text-align: left; color: #ffffff;">
        <span style="background-color: #d7ef73; color: #153941; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
          New Booking
        </span>
        <h1 style="margin: 14px 0 6px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
          VIP Private Tour Booked
        </h1>
        <p style="margin: 0; font-size: 14px; color: #e0f2fe;">
          ${params.viewing.propertyTitle}
        </p>
      </div>
      <div style="padding: 28px; color: #153941;">
        <p>Hello <strong>${params.viewing.agentName}</strong>,</p>
        <p>A new private tour has been scheduled by <strong>${customerName}</strong>.</p>
        <div style="background-color: #f7faf8; border: 1px solid #e2ece7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 6px 0;"><strong>Date & Time:</strong> ${params.viewing.date} (${params.viewing.timeSlot})</p>
          <p style="margin: 6px 0;"><strong>Client:</strong> ${customerName} (${customerPhone})</p>
          <p style="margin: 6px 0;"><strong>Client Email:</strong> ${customerEmail}</p>
          ${params.viewing.notes ? `<p style="margin: 6px 0;"><strong>Notes:</strong> "${params.viewing.notes}"</p>` : ""}
        </div>
        <div style="text-align: center; margin: 30px 0 20px 0;">
          <a href="${googleCalUrl}" target="_blank" style="background-color: #153941; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
            📅 Add to Google Calendar
          </a>
        </div>
      </div>
    </div>
  `;

  const primaryAlertEmail =
    process.env.NOTIFICATION_EMAIL ||
    process.env.AGENT_NOTIFICATION_EMAIL ||
    process.env.GOOGLE_CALENDAR_ID ||
    "darrylraushansingh@gmail.com";

  // Dispatch to primary notification Gmail, assigned agent, and customer
  const agentTargets: string[] = [];
  if (primaryAlertEmail && !agentTargets.includes(primaryAlertEmail)) agentTargets.push(primaryAlertEmail);
  if (agentEmail && agentEmail.includes("@") && !agentTargets.includes(agentEmail)) agentTargets.push(agentEmail);

  const dispatchPromises: Promise<any>[] = [];
  for (const target of agentTargets) {
    dispatchPromises.push(
      sendEmailMessage({
        to: target,
        subject: agentSubject,
        html: agentHtml,
        text: `New VIP Tour: ${params.viewing.propertyTitle} with ${customerName} on ${params.viewing.date} (${params.viewing.timeSlot})`,
        icsContent: ics,
        icsFileName,
      })
    );
  }

  if (customerEmail && !agentTargets.includes(customerEmail)) {
    dispatchPromises.push(
      sendEmailMessage({
        to: customerEmail,
        subject: `🏛️ Viewing Confirmed: ${params.viewing.propertyTitle}`,
        html: agentHtml.replace(
          "A new private tour has been scheduled by",
          "Your private viewing has been booked with specialist " + params.viewing.agentName
        ),
        text: `Viewing Confirmed: ${params.viewing.propertyTitle} on ${params.viewing.date} (${params.viewing.timeSlot})`,
        icsContent: ics,
        icsFileName,
      })
    );
  }

  const results = await Promise.all(dispatchPromises);
  const agentResult = results[0] || { sent: true, mode: "simulated" };
  const customerResult = results[1] || results[0];

  return { agentResult, customerResult, googleCalendarUrl: googleCalUrl };
}

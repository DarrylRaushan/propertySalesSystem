export type LeadActionLog = {
  id: string;
  leadId: string | number;
  action: string;
  timestamp: string; // ISO date string
  formattedDate: string;
  formattedTime: string;
  agentName: string;
  status: "Completed" | "Scheduled" | "Follow-up Logged";
  notes?: string;
  type: "viewing" | "call" | "loan" | "whatsapp" | "proposal" | "note";
};

const STORAGE_KEY = "property_sales_lead_action_history_v1";

function formatTimestamp(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const formattedTime = date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = isToday
    ? "Today"
    : date.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return { formattedDate, formattedTime };
}

function generateDefaultHistory(
  leadId: string | number,
  leadName = "Client",
  currentAction = "Follow-up"
): LeadActionLog[] {
  const now = Date.now();
  const d1 = new Date(now - 1000 * 60 * 60 * 2).toISOString(); // 2 hours ago
  const d2 = new Date(now - 1000 * 60 * 60 * 26).toISOString(); // 1 day ago
  const d3 = new Date(now - 1000 * 60 * 60 * 74).toISOString(); // 3 days ago

  const t1 = formatTimestamp(d1);
  const t2 = formatTimestamp(d2);
  const t3 = formatTimestamp(d3);

  return [
    {
      id: `default-${leadId}-1`,
      leadId,
      action: currentAction || "Consultation in progress",
      timestamp: d1,
      formattedDate: t1.formattedDate,
      formattedTime: t1.formattedTime,
      agentName: "Hannah Cheong",
      status: "In Progress" as any,
      notes: `Reviewing buyer preferences and preparing ${currentAction.toLowerCase()} materials.`,
      type: "proposal",
    },
    {
      id: `default-${leadId}-2`,
      leadId,
      action: "WhatsApp Discovery & Unit Availability",
      timestamp: d2,
      formattedDate: t2.formattedDate,
      formattedTime: t2.formattedTime,
      agentName: "Hannah Cheong",
      status: "Completed",
      notes: `Shared digital brochure & floor plan layout. ${leadName} expressed interest in high-floor units with unobstructed views.`,
      type: "whatsapp",
    },
    {
      id: `default-${leadId}-3`,
      leadId,
      action: "Initial Portal Enquiry Registered",
      timestamp: d3,
      formattedDate: t3.formattedDate,
      formattedTime: t3.formattedTime,
      agentName: "System Automated",
      status: "Completed",
      notes: "Lead captured from verified digital campaign listing. Verified contact credentials.",
      type: "note",
    },
  ];
}

export function getLeadActionLogs(
  leadId: string | number,
  leadName?: string,
  currentAction?: string
): LeadActionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLogs: Record<string, LeadActionLog[]> = raw ? JSON.parse(raw) : {};
    const key = String(leadId);

    if (allLogs[key] && allLogs[key].length > 0) {
      return allLogs[key];
    }

    const defaultLogs = generateDefaultHistory(leadId, leadName, currentAction);
    allLogs[key] = defaultLogs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLogs));
    return defaultLogs;
  } catch (e) {
    return generateDefaultHistory(leadId, leadName, currentAction);
  }
}

export function addLeadActionLog(
  leadId: string | number,
  action: string,
  notes?: string,
  agentName = "Hannah Cheong",
  type: LeadActionLog["type"] = "viewing"
): LeadActionLog {
  const now = new Date().toISOString();
  const { formattedDate, formattedTime } = formatTimestamp(now);

  const newLog: LeadActionLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    leadId,
    action,
    timestamp: now,
    formattedDate,
    formattedTime,
    agentName,
    status: "Completed",
    notes: notes || `Follow-up action "${action}" successfully logged and confirmed.`,
    type,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLogs: Record<string, LeadActionLog[]> = raw ? JSON.parse(raw) : {};
    const key = String(leadId);

    const existing = allLogs[key] || getLeadActionLogs(leadId);
    allLogs[key] = [newLog, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLogs));
    window.dispatchEvent(new CustomEvent("leadActionLogged", { detail: { leadId, log: newLog } }));
  } catch (e) {
    console.error("Error storing lead action log:", e);
  }

  return newLog;
}

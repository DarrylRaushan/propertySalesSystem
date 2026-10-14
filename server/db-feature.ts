import { eq, like, and, or, sql, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  leads,
  properties,
  customers,
  customerAccounts,
  customerShortlists,
  propertyViewings,
  whatsappMessages,
  pipelineStages,
  salesTrend,
  enquirySources,
  followUpHealth,
  users,
  type Lead,
  type InsertLead,
  type Property,
  type InsertProperty,
  type Customer,
  type InsertCustomer,
  type CustomerAccount,
  type InsertCustomerAccount,
  type CustomerShortlist,
  type InsertCustomerShortlist,
  type PropertyViewing,
  type InsertPropertyViewing,
  type WhatsAppMessage,
  type InsertWhatsAppMessage,
  type PipelineStage,
  type SalesTrendRow,
  type EnquirySource,
  type FollowUpHealth,
  type User,
} from "../drizzle/schema";

// ==================== LEADS ====================

// Maximum leads returned if no limit is specified (covers full agent pipelines)
const AGENT_LEADS_CAP = 500;

export async function listLeads(filters?: {
  priority?: string;
  segment?: string;
  search?: string;
  agentId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.priority && filters.priority !== "all") {
    conditions.push(eq(leads.priority, filters.priority as any));
  }
  if (filters?.segment && filters.segment !== "all") {
    conditions.push(eq(leads.segment, filters.segment));
  }
  if (filters?.agentId && filters.agentId !== "all") {
    conditions.push(eq(leads.agentId, filters.agentId));
  }
  if (filters?.search) {
    conditions.push(like(leads.name, `%${filters.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // FIXED: .where() must be chained before .orderBy() in Drizzle ORM
  const cap = filters?.limit ?? AGENT_LEADS_CAP;
  const offset = filters?.offset ?? 0;

  // FIXED: Chain where() before orderBy(), and push limit/offset to SQL
  const baseQuery = db.select().from(leads);
  const orderedQuery = where
    ? baseQuery.where(where).orderBy(desc(leads.value)).limit(cap).offset(offset)
    : baseQuery.orderBy(desc(leads.value)).limit(cap).offset(offset);

  return orderedQuery;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(lead);
  return result;
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leads).where(eq(leads.id, id));
}

// ==================== PROPERTIES ====================

export async function listProperties(filters?: {
  activeOnly?: boolean;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.activeOnly) {
    conditions.push(eq(properties.isActive, true));
  }
  if (filters?.search) {
    conditions.push(like(properties.title, `%${filters.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // FIXED: .where() must be chained before .orderBy() in Drizzle ORM
  const baseQuery = db.select().from(properties);
  return where
    ? baseQuery.where(where).orderBy(desc(properties.price))
    : baseQuery.orderBy(desc(properties.price));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(properties).values(property);
}

export async function updateProperty(id: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(properties).set(data).where(eq(properties.id, id));
}

// ==================== CUSTOMERS ====================

export async function listCustomers(filters?: { segment?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.segment && filters.segment !== "all") {
    conditions.push(eq(customers.segment, filters.segment));
  }
  if (filters?.search) {
    conditions.push(like(customers.name, `%${filters.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db.select().from(customers).orderBy(desc(customers.totalPurchased));
  if (where) query.where(where);
  return query;
}

export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(customers).values(customer);
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

// ==================== PIPELINE STAGES ====================

/** Normalise UI period label ("Week"/"Month"/"Quarter") to DB value. */
export function normalizePeriod(period?: string): string {
  if (!period) return "quarter"; // default
  const p = period.toLowerCase();
  if (p === "week" || p === "month" || p === "quarter") return p;
  if (p === "current") return "quarter";
  return "quarter";
}

export async function listPipelineStages(period?: string) {
  const db = await getDb();
  if (!db) return [];
  const p = normalizePeriod(period);
  return db.select().from(pipelineStages).where(eq(pipelineStages.period, p)).orderBy(desc(pipelineStages.count));
}

// ==================== SALES TREND ====================

export async function listSalesTrend(year?: number) {
  const db = await getDb();
  if (!db) return [];
  const y = year || new Date().getFullYear();
  return db.select().from(salesTrend).where(eq(salesTrend.year, y)).orderBy(salesTrend.id);
}

/**
 * Return sales trend data for a given period label ("week"/"month"/"quarter").
 * Uses dedicated year slots: week=2025, month=2026, quarter=2027.
 */
export async function listSalesTrendByPeriod(period?: string) {
  const db = await getDb();
  if (!db) return [];
  const p = normalizePeriod(period);
  const yearMap: Record<string, number> = { week: 2025, month: 2026, quarter: 2027 };
  const y = yearMap[p] ?? 2027;
  return db.select().from(salesTrend).where(eq(salesTrend.year, y)).orderBy(salesTrend.id);
}

// ==================== ENQUIRY SOURCES ====================

export async function listEnquirySources(period?: string) {
  const db = await getDb();
  if (!db) return [];
  const p = normalizePeriod(period);
  return db.select().from(enquirySources).where(eq(enquirySources.period, p)).orderBy(desc(enquirySources.count));
}

// ==================== FOLLOW-UP HEALTH ====================

export async function listFollowUpHealth(period?: string) {
  const db = await getDb();
  if (!db) return [];
  const p = normalizePeriod(period);
  return db.select().from(followUpHealth).where(eq(followUpHealth.period, p));
}

// ==================== DASHBOARD METRICS ====================

export async function getDashboardMetrics(period?: string) {
  const db = await getDb();
  if (!db) return null;

  const p = normalizePeriod(period);

  // Total leads (always current — period doesn't filter leads)
  const [totalLeadsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(leads);
  const totalLeads = totalLeadsResult?.count || 0;

  // High priority leads
  const [highPriorityResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(leads)
    .where(eq(leads.priority, "High"));
  const highPriority = highPriorityResult?.count || 0;

  // Active properties
  const [activePropsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(properties)
    .where(eq(properties.isActive, true));
  const activeProperties = activePropsResult?.count || 0;

  // Expected sales value — scale by period window
  const [expectedValueResult] = await db
    .select({ expected: sql<number>`SUM(value * probability / 100)` })
    .from(leads);
  const rawExpected = expectedValueResult?.expected || 0;
  // Quarter = full pipeline value; Month ≈ ⅓; Week ≈ 1/13
  const periodMultiplier = p === "week" ? 1 / 13 : p === "month" ? 1 / 3 : 1;
  const expectedSalesValue = Math.round(rawExpected * periodMultiplier);

  // Total customers
  const [totalCustomersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers);
  const totalCustomers = totalCustomersResult?.count || 0;

  // Priority distribution
  const priorityDistribution = await db
    .select({
      priority: leads.priority,
      count: sql<number>`COUNT(*)`,
    })
    .from(leads)
    .groupBy(leads.priority);

  return {
    totalLeads,
    highPriority,
    activeProperties,
    expectedSalesValue,
    totalCustomers,
    priorityDistribution,
    period: p,
  };
}


// ==================== CUSTOMER ACCOUNTS (Login) ====================

export async function findCustomerAccountByEmail(email: string): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.email, email.toLowerCase().trim()))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerAccountById(id: number): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customerAccounts).where(eq(customerAccounts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCustomerAccount(
  id: number,
  data: Partial<InsertCustomerAccount>
): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customerAccounts).set(data).where(eq(customerAccounts.id, id));
  return getCustomerAccountById(id);
}

// ==================== CUSTOMER SHORTLISTS ====================

export async function getShortlistByCustomer(customerAccountId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ propertyId: customerShortlists.propertyId })
    .from(customerShortlists)
    .where(eq(customerShortlists.customerAccountId, customerAccountId));
  return rows.map((r) => r.propertyId);
}

export async function toggleShortlist(customerAccountId: number, propertyId: number): Promise<{ saved: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(customerShortlists)
    .where(and(
      eq(customerShortlists.customerAccountId, customerAccountId),
      eq(customerShortlists.propertyId, propertyId),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(customerShortlists).where(eq(customerShortlists.id, existing[0].id));
    return { saved: false };
  } else {
    await db.insert(customerShortlists).values({ customerAccountId, propertyId });
    return { saved: true };
  }
}

/**
 * Fetch full property details for all of a customer's shortlisted properties,
 * ordered by price descending.
 */
export async function getShortlistedProperties(customerAccountId: number): Promise<Property[]> {
  const db = await getDb();
  if (!db) return [];
  const shortlistIds = await getShortlistByCustomer(customerAccountId);
  if (shortlistIds.length === 0) return [];
  return db
    .select()
    .from(properties)
    .where(inArray(properties.id, shortlistIds))
    .orderBy(desc(properties.price));
}

// ==================== PROPERTY VIEWINGS ====================

export async function getViewingsByCustomer(customerAccountId: number): Promise<PropertyViewing[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(propertyViewings)
    .where(eq(propertyViewings.customerAccountId, customerAccountId))
    .orderBy(desc(propertyViewings.createdAt));
}

/**
 * Return viewings assigned to a specific agent (for the agent-side pipeline view).
 * Excludes old cancelled viewings — only shows Confirmed/Pending plus recent Cancelled.
 */
// Set to track viewings currently being synced to Google Calendar to prevent concurrent duplicate syncs
const syncingViewingIds = new Set<number>();

export async function listViewingsByAgent(
  agentId: string,
  limit = 20
): Promise<(PropertyViewing & { customerName?: string; customerPhone?: string; customerEmail?: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(propertyViewings)
    .where(eq(propertyViewings.agentId, agentId))
    .orderBy(desc(propertyViewings.createdAt))
    .limit(limit);

  // Batch customer accounts to avoid N+1 queries
  const customerAccountIds = Array.from(
    new Set(
      rows
        .map((v) => v.customerAccountId)
        .filter((id): id is number => typeof id === "number" && id > 0)
    )
  );

  const accountMap = new Map<number, CustomerAccount>();
  if (customerAccountIds.length > 0) {
    const accRows = await db
      .select()
      .from(customerAccounts)
      .where(inArray(customerAccounts.id, customerAccountIds));
    for (const acc of accRows) {
      accountMap.set(acc.id, acc);
    }
  }

  // Attach customer details from batched customer_accounts
  const withNames = rows.map((v) => {
    let customerName: string | undefined;
    let customerPhone: string | undefined;
    let customerEmail: string | undefined;

    if (v.customerAccountId) {
      const acc = accountMap.get(v.customerAccountId);
      if (acc) {
        customerName = acc.name ?? undefined;
        customerPhone = acc.phone ?? undefined;
        customerEmail = acc.email ?? undefined;
      }
    }

    // Background catch-up sync for confirmed viewings missing Google Calendar event ID
    // Run asynchronously without blocking read response, guarded against duplicate syncs
    if (!v.googleCalendarEventId && v.status === "Confirmed" && !syncingViewingIds.has(v.id)) {
      syncingViewingIds.add(v.id);
      void (async () => {
        try {
          const { createGoogleCalendarEvent } = await import("./googleCalendarService");
          const calResult = await createGoogleCalendarEvent({
            viewing: v,
            customer: {
              name: customerName || "VIP Client",
              email: customerEmail || "darrylraushansingh@gmail.com",
              phone: customerPhone || v.agentPhone,
            },
          });
          if (calResult.success && calResult.eventId) {
            await updateViewingGoogleCalendar(v.id, {
              googleCalendarEventId: calResult.eventId,
              googleCalendarHtmlLink: calResult.htmlLink || null,
            });
            v.googleCalendarEventId = calResult.eventId;
            v.googleCalendarHtmlLink = calResult.htmlLink || null;
          }
        } catch (syncErr) {
          console.warn(`[listViewingsByAgent] Background auto-sync notice for viewing #${v.id}:`, syncErr);
        } finally {
          syncingViewingIds.delete(v.id);
        }
      })();
    }

    return {
      ...v,
      customerName,
      customerPhone,
      customerEmail,
    };
  });

  return withNames;
}

export async function createViewing(data: Omit<InsertPropertyViewing, "id" | "createdAt">): Promise<PropertyViewing> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Duplicate guard: prevent inserting if an active (non-Cancelled) booking already
  // exists for the same customer + property + date + time slot. This blocks the
  // double-fire that can happen in React StrictMode / rapid re-renders.
  if (data.customerAccountId) {
    const existing = await db
      .select()
      .from(propertyViewings)
      .where(
        and(
          eq(propertyViewings.customerAccountId, data.customerAccountId),
          eq(propertyViewings.propertyId, data.propertyId),
          eq(propertyViewings.date, data.date),
          eq(propertyViewings.timeSlot, data.timeSlot),
        )
      )
      .limit(1);

    const activeMatch = existing.find((v) => v.status !== "Cancelled");
    if (activeMatch) {
      // Return the already-existing booking instead of creating a duplicate
      return activeMatch;
    }
  }

  const result = await db.insert(propertyViewings).values(data).returning();
  return result[0];
}

export async function cancelViewing(id: number, customerAccountId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(propertyViewings)
    .set({
      status: "Cancelled",
      cancelledVia: "portal",
      cancellationReason: "Cancelled by customer in portal",
    })
    .where(and(
      eq(propertyViewings.id, id),
      eq(propertyViewings.customerAccountId, customerAccountId),
    ));
}

export async function deleteViewing(id: number, customerAccountId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(propertyViewings)
    .where(and(
      eq(propertyViewings.id, id),
      eq(propertyViewings.customerAccountId, customerAccountId),
    ));
}

export async function getViewingById(id: number): Promise<PropertyViewing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(propertyViewings).where(eq(propertyViewings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Clean and normalize phone numbers for reliable WhatsApp matching.
 * e.g. "+60 12-882 1099" -> "60128821099", "0128821099" -> "60128821099"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("01")) cleaned = "60" + cleaned.substring(1);
  return cleaned;
}

export async function findCustomerAccountByPhone(rawPhone: string): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return undefined;
  
  const allAccounts = await db.select().from(customerAccounts);
  const matched = allAccounts.find((acc) => {
    if (!acc.phone) return false;
    const accNorm = normalizePhoneNumber(acc.phone);
    if (!accNorm) return false;
    return (
      accNorm === normalized ||
      accNorm.endsWith(normalized.slice(-8)) ||
      normalized.endsWith(accNorm.slice(-8)) ||
      accNorm.slice(-7) === normalized.slice(-7)
    );
  });
  return matched;
}

export async function findCustomerAccountByName(name: string): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db || !name) return undefined;
  const trimmed = name.trim().toLowerCase();
  const allAccounts = await db.select().from(customerAccounts);
  return allAccounts.find((acc) => {
    const accName = acc.name.toLowerCase();
    return accName === trimmed || accName.includes(trimmed) || trimmed.includes(accName);
  });
}

export async function getUpcomingViewingForPhone(rawPhone: string): Promise<PropertyViewing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const customer = await findCustomerAccountByPhone(rawPhone);
  if (customer) {
    const viewings = await db
      .select()
      .from(propertyViewings)
      .where(and(
        eq(propertyViewings.customerAccountId, customer.id),
        eq(propertyViewings.status, "Confirmed"),
      ))
      .orderBy(propertyViewings.date, propertyViewings.timeSlot);
    if (viewings.length > 0) return viewings[0];
  }

  // Also match on leads / customers if any
  return undefined;
}

export async function cancelViewingDirect(
  id: number,
  cancelledVia: string = "whatsapp",
  cancellationReason: string = "Cancelled via WhatsApp request"
): Promise<PropertyViewing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(propertyViewings)
    .set({
      status: "Cancelled",
      cancelledVia,
      cancellationReason,
    })
    .where(eq(propertyViewings.id, id));

  return getViewingById(id);
}

export async function rescheduleViewingDirect(
  id: number,
  newDate: string,
  newTimeSlot: string
): Promise<PropertyViewing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(propertyViewings)
    .set({
      date: newDate,
      timeSlot: newTimeSlot,
      status: "Confirmed",
      cancellationReason: null,
      cancelledVia: null,
    })
    .where(eq(propertyViewings.id, id));

  return getViewingById(id);
}


export async function updateCustomerAccountPhone(id: number, phone: string): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(customerAccounts).set({ phone }).where(eq(customerAccounts.id, id));
  return getCustomerAccountById(id);
}

// ==================== WHATSAPP MESSAGES ====================

export async function logWhatsAppMessage(data: InsertWhatsAppMessage): Promise<WhatsAppMessage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
  };
  const result = await db.insert(whatsappMessages).values(values).returning();
  return result[0];
}

export async function getWhatsAppMessages(filters?: {
  phone?: string;
  viewingId?: number;
  customerAccountId?: number;
  limit?: number;
}): Promise<WhatsAppMessage[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  // Priority rule: if customerAccountId is provided, use it EXCLUSIVELY.
  // This prevents two accounts sharing the same phone (e.g. in testing) from
  // seeing each other's message history.
  if (filters?.customerAccountId) {
    conditions.push(eq(whatsappMessages.customerAccountId, filters.customerAccountId));
  } else if (filters?.phone) {
    // Only fall back to phone-based matching when there is no account ID context
    const norm = normalizePhoneNumber(filters.phone);
    conditions.push(like(whatsappMessages.phone, `%${norm.slice(-8)}%`));
  }

  if (filters?.viewingId) {
    conditions.push(eq(whatsappMessages.viewingId, filters.viewingId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // ALWAYS order by desc(whatsappMessages.id) so the newest messages are ALWAYS returned first!
  let query = db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.id));
  if (where) {
    query = query.where(where) as any;
  }
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return query;
}



export async function getWhatsAppStats() {
  const db = await getDb();
  if (!db) return { totalSent: 0, totalReceived: 0, cancellationsProcessed: 0, activeNumbers: 0 };

  const [totalSentRes] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.direction, "outgoing"));

  const [totalReceivedRes] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.direction, "incoming"));

  const [cancellationsRes] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(propertyViewings)
    .where(eq(propertyViewings.cancelledVia, "whatsapp"));

  const [activeNumbersRes] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${whatsappMessages.phone})` })
    .from(whatsappMessages);

  return {
    totalSent: totalSentRes?.count || 0,
    totalReceived: totalReceivedRes?.count || 0,
    cancellationsProcessed: cancellationsRes?.count || 0,
    activeNumbers: activeNumbersRes?.count || 0,
  };
}

/**
 * Look up a user/agent by their agentCode for resolving agent details
 * when creating WhatsApp-initiated bookings.
 */
export async function getAgentByCode(agentCode: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.agentCode, agentCode))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateViewingGoogleCalendar(
  id: number,
  data: { googleCalendarEventId?: string | null; googleCalendarHtmlLink?: string | null }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(propertyViewings).set(data).where(eq(propertyViewings.id, id));
}


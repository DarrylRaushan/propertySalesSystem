import { eq, like, and, sql, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  leads,
  properties,
  customers,
  customerAccounts,
  customerShortlists,
  propertyViewings,
  pipelineStages,
  salesTrend,
  enquirySources,
  followUpHealth,
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
  type PipelineStage,
  type SalesTrendRow,
  type EnquirySource,
  type FollowUpHealth,
} from "../drizzle/schema";

// ==================== LEADS ====================

// Maximum leads visible per agent in the workspace view
const AGENT_LEADS_CAP = 20;

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

  const query = db.select().from(leads).orderBy(desc(leads.value));
  if (where) query.where(where);

  let results = await query;

  if (filters?.offset) {
    results = results.slice(filters.offset);
  }

  // Apply per-agent cap of 20, or an explicit limit if lower
  const cap = filters?.limit ? Math.min(filters.limit, AGENT_LEADS_CAP) : AGENT_LEADS_CAP;
  results = results.slice(0, cap);

  return results;
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
  const query = db.select().from(properties).orderBy(desc(properties.price));
  if (where) query.where(where);
  return query;
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

export async function createViewing(data: Omit<InsertPropertyViewing, "id" | "createdAt">): Promise<PropertyViewing> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(propertyViewings).values(data).returning();
  return result[0];
}

export async function cancelViewing(id: number, customerAccountId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(propertyViewings)
    .set({ status: "Cancelled" })
    .where(and(
      eq(propertyViewings.id, id),
      eq(propertyViewings.customerAccountId, customerAccountId),
    ));
}

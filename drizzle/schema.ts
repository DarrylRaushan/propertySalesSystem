import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 1. Users / Agents - Core identity table backing authentication & agent portfolio ownership.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  agentCode: text("agentCode").unique(), // "hannah", "amir", "chloe", "admin"
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").default("agent").notNull(), // "agent", "admin", "user"
  specialization: text("specialization"), // e.g. "Prime High-Rise & Luxury Developments"
  loginMethod: text("loginMethod"),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
  lastSignedIn: text("lastSignedIn").default("CURRENT_TIMESTAMP").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 2. Properties - Real estate catalog listings
 */
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  developer: text("developer").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  price: real("price").notNull(),
  beds: integer("beds").default(0).notNull(),
  baths: integer("baths").default(0).notNull(),
  size: text("size").notNull(),
  description: text("description"),
  features: text("features"), // JSON array as text
  imageUrl: text("imageUrl"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  // Relationship: Assigned lead agent for this property
  agentId: text("agentId").references(() => users.agentCode),
  // Customer portal enrichment fields
  badge: text("badge"),             // e.g. "Limited VIP Units", "Architectural Icon"
  rentalYield: text("rentalYield"), // e.g. "5.8%"
  collection: text("collection"),  // JSON array: ["penthouses","transit","ready"]
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * 3. Leads - Potential buyers / inquiries in active sales funnel
 */
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  accent: text("accent").notNull(),
  location: text("location").notNull(),
  segment: text("segment").notNull(),
  priority: text("priority").default("Medium").notNull(), // High, Medium, Low
  probability: real("probability").notNull(),
  value: real("value").notNull(),
  property: text("property").notNull(),
  action: text("action").notNull(),
  // Relationship: Assigned agent handling this lead
  agentId: text("agentId").default("hannah").notNull().references(() => users.agentCode),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  lastContacted: text("lastContacted"),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * 4. Customers - Confirmed buyers in agent CRM portfolio
 */
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  segment: text("segment").notNull(),
  totalPurchased: real("totalPurchased").default(0).notNull(),
  unitsOwned: integer("unitsOwned").default(0).notNull(),
  isVip: integer("isVip", { mode: "boolean" }).default(false).notNull(),
  notes: text("notes"),
  // Relationship: Assigned managing agent
  agentId: text("agentId").references(() => users.agentCode),
  // Relationship: Converted from sales lead (optional)
  leadId: integer("leadId").references(() => leads.id),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * 5. Customer Accounts - Self-service buyer portal logins
 */
export const customerAccounts = sqliteTable("customer_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  avatarInitials: text("avatarInitials").notNull(),
  segment: text("segment").notNull(), // e.g. "High Net Worth Investor"
  budget: text("budget"),             // e.g. "RM 2,500,000 - RM 4,500,000"
  preferredLocation: text("preferredLocation"),
  preferredTypes: text("preferredTypes"), // JSON array or comma-separated e.g. "Condominium,Penthouse"
  minBeds: integer("minBeds").default(0),
  investmentGoal: text("investmentGoal"), // e.g. "High Rental Yield", "Capital Appreciation", "Family Living"
  preferredFeatures: text("preferredFeatures"), // JSON array or comma-separated e.g. "Private Lift,Sky Pool"
  // Relationship: Dedicated concierge agent
  assignedAgentId: text("assignedAgentId").references(() => users.agentCode),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type InsertCustomerAccount = typeof customerAccounts.$inferInsert;

/**
 * 6. Customer Shortlists - M:N join table between customer accounts & saved properties
 */
export const customerShortlists = sqliteTable("customer_shortlists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerAccountId: integer("customerAccountId")
    .notNull()
    .references(() => customerAccounts.id, { onDelete: "cascade" }),
  propertyId: integer("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type CustomerShortlist = typeof customerShortlists.$inferSelect;
export type InsertCustomerShortlist = typeof customerShortlists.$inferInsert;

/**
 * 7. Property Viewings - VIP private tour bookings
 */
export const propertyViewings = sqliteTable("property_viewings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerAccountId: integer("customerAccountId")
    .notNull()
    .references(() => customerAccounts.id, { onDelete: "cascade" }),
  propertyId: integer("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  agentId: text("agentId")
    .notNull()
    .references(() => users.agentCode),
  propertyTitle: text("propertyTitle").notNull(),
  propertyLocation: text("propertyLocation").notNull(),
  propertyPrice: real("propertyPrice").notNull(),
  propertyImage: text("propertyImage"),
  agentName: text("agentName").notNull(),
  agentPhone: text("agentPhone").notNull(),
  date: text("date").notNull(),
  timeSlot: text("timeSlot").notNull(),
  status: text("status").default("Confirmed").notNull(), // Confirmed, Pending, Cancelled, Completed
  notes: text("notes"),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type PropertyViewing = typeof propertyViewings.$inferSelect;
export type InsertPropertyViewing = typeof propertyViewings.$inferInsert;

/**
 * 8. Pipeline Stages - Sales funnel metrics (brokerage or agent-scoped)
 */
export const pipelineStages = sqliteTable("pipeline_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agentId").references(() => users.agentCode),
  name: text("name").notNull(),
  count: integer("count").default(0).notNull(),
  conversionRate: real("conversionRate").default(0).notNull(),
  period: text("period").default("current").notNull(),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

/**
 * 9. Sales Trend Data - Monthly revenue snapshots
 */
export const salesTrend = sqliteTable("sales_trend", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agentId").references(() => users.agentCode),
  month: text("month").notNull(),
  value: real("value").notNull(),
  year: integer("year").notNull(),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type SalesTrendRow = typeof salesTrend.$inferSelect;
export type InsertSalesTrend = typeof salesTrend.$inferInsert;

/**
 * 10. Enquiry Sources - Lead generation channel distribution
 */
export const enquirySources = sqliteTable("enquiry_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agentId").references(() => users.agentCode),
  source: text("source").notNull(),
  count: integer("count").default(0).notNull(),
  percentage: real("percentage").default(0).notNull(),
  period: text("period").default("current").notNull(),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type EnquirySource = typeof enquirySources.$inferSelect;
export type InsertEnquirySource = typeof enquirySources.$inferInsert;

/**
 * 11. Follow-Up Health - Agent cadence & response SLAs
 */
export const followUpHealth = sqliteTable("follow_up_health", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agentId").references(() => users.agentCode),
  metric: text("metric").notNull(),
  value: real("value").default(0).notNull(),
  label: text("label").notNull(),
  sub: text("sub"),
  period: text("period").default("current").notNull(),
  createdAt: text("createdAt").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updatedAt").default("CURRENT_TIMESTAMP").notNull(),
});

export type FollowUpHealth = typeof followUpHealth.$inferSelect;
export type InsertFollowUpHealth = typeof followUpHealth.$inferInsert;
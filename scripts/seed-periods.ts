/**
 * seed-periods.ts
 *
 * Idempotent script that inserts Week / Month / Quarter rows into the
 * period-aware DB tables: pipeline_stages, enquiry_sources, follow_up_health
 * and year-partitioned rows into sales_trend.
 *
 * Run once (after seed-custom.ts):
 *   npx tsx seed-periods.ts
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import {
  pipelineStages,
  salesTrend,
  enquirySources,
  followUpHealth,
} from "../drizzle/schema.ts";

async function upsertPipelinePeriod(
  db: ReturnType<typeof drizzle>,
  period: string,
  enquiries: number,
  qualified: number,
  bookings: number
) {
  // Delete existing rows for this period then insert fresh
  await db.delete(pipelineStages).where(eq(pipelineStages.period, period));
  await db.insert(pipelineStages).values([
    {
      name: "Enquiries",
      count: enquiries,
      conversionRate: 100,
      period,
    },
    {
      name: "Qualified",
      count: qualified,
      conversionRate: +(qualified / enquiries * 100).toFixed(1),
      period,
    },
    {
      name: "Bookings",
      count: bookings,
      conversionRate: +(bookings / qualified * 100).toFixed(1),
      period,
    },
  ]);
}

async function upsertEnquirySourcesPeriod(
  db: ReturnType<typeof drizzle>,
  period: string,
  organic: number,
  portal: number,
  referrals: number,
  whatsapp: number
) {
  const total = organic + portal + referrals + whatsapp;
  await db.delete(enquirySources).where(eq(enquirySources.period, period));
  await db.insert(enquirySources).values([
    { source: "Organic enquiries", count: organic, percentage: +(organic / total * 100).toFixed(1), period },
    { source: "Portal campaigns", count: portal, percentage: +(portal / total * 100).toFixed(1), period },
    { source: "Referrals", count: referrals, percentage: +(referrals / total * 100).toFixed(1), period },
    { source: "WhatsApp follow-up", count: whatsapp, percentage: +(whatsapp / total * 100).toFixed(1), period },
  ]);
}

async function upsertFollowUpHealthPeriod(
  db: ReturnType<typeof drizzle>,
  period: string,
  scheduled: number,
  contacted: number
) {
  await db.delete(followUpHealth).where(eq(followUpHealth.period, period));
  await db.insert(followUpHealth).values([
    { metric: "scheduled", value: scheduled, label: "Scheduled", sub: "of priority leads", period },
    { metric: "contacted", value: contacted, label: "Contacted this period", sub: "response within 48h", period },
  ]);
}

async function upsertSalesTrendPeriod(
  db: ReturnType<typeof drizzle>,
  period: string,
  rows: { month: string; value: number; year: number }[]
) {
  // Sales trend uses year-based partitioning; we add a period field via separate tag rows
  // Instead we just store period-specific months in a dedicated period string for 2025
  // Use year=2025 for weekly/monthly/quarterly slices so they don't collide with 2024 annual trend
  const periodYear = period === "week" ? 2025 : period === "month" ? 2026 : 2027;
  await db.delete(salesTrend).where(eq(salesTrend.year, periodYear));
  for (const row of rows) {
    await db.insert(salesTrend).values({ month: row.month, value: row.value, year: periodYear });
  }
}

async function main() {
  console.log("Connecting to SQLite DB...");
  const sqlite = new Database("sqlite.db");
  const db = drizzle(sqlite);

  // ─── PIPELINE STAGES ────────────────────────────────────────────────
  console.log("Seeding pipeline stages (week / month / quarter)...");

  // Quarterly (biggest numbers — all enquiries in 3-month window)
  await upsertPipelinePeriod(db, "quarter", 428, 164, 18);

  // Monthly (roughly ⅓ of quarterly)
  await upsertPipelinePeriod(db, "month", 142, 54, 6);

  // Weekly (roughly ¼ of monthly)
  await upsertPipelinePeriod(db, "week", 38, 14, 2);

  console.log("  ✓ Pipeline stages done");

  // ─── ENQUIRY SOURCES ────────────────────────────────────────────────
  console.log("Seeding enquiry sources (week / month / quarter)...");

  await upsertEnquirySourcesPeriod(db, "quarter", 168, 124, 82, 54);
  await upsertEnquirySourcesPeriod(db, "month",   55,  41, 27, 18);
  await upsertEnquirySourcesPeriod(db, "week",    14,  10,  7,  5);

  console.log("  ✓ Enquiry sources done");

  // ─── FOLLOW-UP HEALTH ───────────────────────────────────────────────
  console.log("Seeding follow-up health (week / month / quarter)...");

  await upsertFollowUpHealthPeriod(db, "quarter", 82, 64);
  await upsertFollowUpHealthPeriod(db, "month",   78, 61);
  await upsertFollowUpHealthPeriod(db, "week",    74, 58);

  console.log("  ✓ Follow-up health done");

  // ─── SALES TREND ────────────────────────────────────────────────────
  // Week: last 7 days broken into days (Mon→Sun); store as abbreviated day names
  console.log("Seeding sales trend slices for week / month / quarter...");

  await upsertSalesTrendPeriod(db, "week", [
    { month: "Mon", value: 2_100_000, year: 2025 },
    { month: "Tue", value: 1_850_000, year: 2025 },
    { month: "Wed", value: 2_400_000, year: 2025 },
    { month: "Thu", value: 2_750_000, year: 2025 },
    { month: "Fri", value: 3_100_000, year: 2025 },
    { month: "Sat", value: 1_600_000, year: 2025 },
    { month: "Sun", value: 900_000,   year: 2025 },
  ]);

  // Month: last 4 weeks
  await upsertSalesTrendPeriod(db, "month", [
    { month: "Wk 1", value: 4_200_000, year: 2026 },
    { month: "Wk 2", value: 4_800_000, year: 2026 },
    { month: "Wk 3", value: 3_950_000, year: 2026 },
    { month: "Wk 4", value: 5_100_000, year: 2026 },
  ]);

  // Quarter: 3 months
  await upsertSalesTrendPeriod(db, "quarter", [
    { month: "Aug", value: 12_400_000, year: 2027 },
    { month: "Sep", value: 15_800_000, year: 2027 },
    { month: "Oct", value: 18_400_000, year: 2027 },
  ]);

  console.log("  ✓ Sales trend done");
  console.log("\n✓ All period data seeded successfully!");
  sqlite.close();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

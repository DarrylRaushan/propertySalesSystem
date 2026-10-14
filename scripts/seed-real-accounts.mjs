/**
 * Seed real test accounts:
 *   - Customer: Darryl Raushan Singh (darrylraushansingh@gmail.com, +60183865414)
 *   - Agent:    Darryl Raushan / Bert Bob (bertbob944@gmail.com, same phone)
 *
 * Run: node scripts/seed-real-accounts.mjs
 */
import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

// ── 1. Customer account (customer_accounts table) ────────────────────────────
const existingCustomer = db
  .prepare("SELECT id FROM customer_accounts WHERE email = ?")
  .get("darrylraushansingh@gmail.com");

if (!existingCustomer) {
  const insertCustomer = db.prepare(`
    INSERT INTO customer_accounts
      (name, email, password, phone, avatarInitials, segment, budget,
       preferredLocation, preferredTypes, minBeds, investmentGoal, preferredFeatures)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCustomer.run(
    "Darryl Raushan",
    "darrylraushansingh@gmail.com",
    "darryl123",
    "+60183865414",
    "DR",
    "Developer & VIP Preview",
    "RM 1,500,000 - RM 5,000,000",
    "Mont Kiara, KLCC & Damansara",
    "Penthouse,Condominium,Serviced residence",
    2,
    "System Testing & Portfolio",
    "Sky Pool,Private Lift,Smart Home,Concierge"
  );

  const inserted = db
    .prepare("SELECT id FROM customer_accounts WHERE email = ?")
    .get("darrylraushansingh@gmail.com");
  console.log("✓ Seeded customer account: Darryl Raushan (id=" + inserted.id + ")");
} else {
  console.log("ℹ Customer already exists (id=" + existingCustomer.id + "), skipping.");
}

// ── 2. Agent entry (users table) ─────────────────────────────────────────────
const existingAgent = db
  .prepare("SELECT id FROM users WHERE agentCode = ?")
  .get("darryl");

if (!existingAgent) {
  const insertAgent = db.prepare(`
    INSERT INTO users
      (openId, agentCode, name, email, phone, role, specialization, loginMethod)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAgent.run(
    "darryl-raushan-real",
    "darryl",
    "Darryl Raushan",
    "bertbob944@gmail.com",
    "+60183865414",
    "agent",
    "Ultra-Luxury Penthouses & Private Portfolio",
    "email"
  );

  const agent = db
    .prepare("SELECT id FROM users WHERE agentCode = ?")
    .get("darryl");
  console.log("✓ Seeded agent: Darryl Raushan / bertbob944@gmail.com (id=" + agent.id + ")");
} else {
  db.prepare("UPDATE users SET email = ?, phone = ? WHERE agentCode = ?").run(
    "bertbob944@gmail.com",
    "+60183865414",
    "darryl"
  );
  console.log("ℹ Agent 'darryl' already exists (id=" + existingAgent.id + "), email/phone updated.");
}

// ── 3. Print all accounts for reference ──────────────────────────────────────
const allAccounts = db
  .prepare("SELECT id, name, email FROM customer_accounts ORDER BY id")
  .all();
console.log("\n📋 All customer_accounts:");
for (const a of allAccounts) {
  console.log("  id=" + a.id + "  " + a.name + "  <" + a.email + ">");
}

const allAgents = db
  .prepare("SELECT id, agentCode, name, email FROM users WHERE role='agent' ORDER BY id")
  .all();
console.log("\n📋 All agents:");
for (const a of allAgents) {
  console.log("  id=" + a.id + "  code=" + a.agentCode + "  " + a.name + "  <" + a.email + ">");
}

db.close();
console.log("\n✅ Done.");

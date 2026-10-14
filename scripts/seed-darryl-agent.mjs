/**
 * Seed Darryl agent with leads, customers and assigned properties.
 * Run: node scripts/seed-darryl-agent.mjs
 */
import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

// ─── 0. Check what we have ────────────────────────────────────────────────────
const existing = {
  leads: db.prepare("SELECT COUNT(*) as n FROM leads WHERE agentId='darryl'").get().n,
  customers: db.prepare("SELECT COUNT(*) as n FROM customers WHERE agentId='darryl'").get().n,
  properties: db.prepare("SELECT COUNT(*) as n FROM properties WHERE agentId='darryl'").get().n,
};
console.log("Current darryl data →", existing);

// ─── 1. Assign 3 existing properties to Darryl ───────────────────────────────
// Pick properties currently without an agent or re-assign some nice ones
const propAssignments = db.prepare("SELECT id, title FROM properties ORDER BY price DESC LIMIT 40").all();

// We want the Astaka penthouse (highest price), Conlay, and 8 Conlay Kempinski
const darrylProps = propAssignments.filter(p =>
  p.title.includes("Astaka") ||
  p.title.includes("Conlay") ||
  p.title.includes("Kempinski") ||
  p.title.includes("Pavilion")
).slice(0, 4);

// Fallback: just grab top-3 by price if none matched
const assignList = darrylProps.length >= 2 ? darrylProps : propAssignments.slice(0, 3);

const setPropAgent = db.prepare("UPDATE properties SET agentId='darryl' WHERE id=?");
for (const p of assignList) {
  setPropAgent.run(p.id);
  console.log("  ✓ Assigned property to darryl:", p.title, "(id=" + p.id + ")");
}

// ─── 2. Seed Leads for Darryl ─────────────────────────────────────────────────
if (existing.leads === 0) {
  const insertLead = db.prepare(`
    INSERT INTO leads (name, initials, accent, location, segment, priority, probability, value, property, action, phone, email, notes, lastContacted, agentId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'darryl')
  `);

  const leads = [
    // name, initials, accent, location, segment, priority, probability, value, property, action, phone, email, notes, lastContacted
    [
      "Raj Krishnamurthy", "RK", "bg-violet-100",
      "KLCC, Kuala Lumpur", "High Net Worth Investor", "High",
      82, 4200000,
      "The Astaka Super Luxury Penthouse",
      "Schedule VIP site tour — shortlisted as primary residence",
      "+60 12-991 3374", "raj.krishna@vipmail.com",
      "Singapore-based HNWI. Interested in penthouse floor only. Budget up to RM 5M. Wants full-floor unit with Singapore Straits view.",
      "2026-10-03"
    ],
    [
      "Dato' Farouk Aziz", "FA", "bg-amber-100",
      "Bukit Bintang, Kuala Lumpur", "VIP Portfolio Buyer", "High",
      74, 3450000,
      "8 Conlay Kempinski Branded Residences",
      "Arrange private showflat walk-through with Kempinski concierge team",
      "+60 17-882 9912", "farouk.aziz@datocorp.my",
      "Dato' with interest in branded residences as part of asset diversification. Expects buy-to-lease with Kempinski hotel programme. Follow up after Eid break.",
      "2026-10-01"
    ],
    [
      "Mei Lin Ooi", "ML", "bg-teal-100",
      "Damansara Heights, Kuala Lumpur", "Ready Buyer", "High",
      68, 2850000,
      "Pavilion Damansara Heights Sky Residence",
      "Send digital brochure + floor plan for 3-bedroom unit",
      "+60 16-445 7723", "meilin.ooi@kl-legal.com",
      "Senior legal partner looking for lifestyle upgrade. Close to Pavilion retail. Very interested in private lift lobby and MRT connectivity. Wants move-in Q1 2027.",
      "2026-10-04"
    ],
    [
      "Thomas Bernstein", "TB", "bg-sky-100",
      "KLCC, Kuala Lumpur", "VIP Expat", "Medium",
      55, 2100000,
      "The Conlay Signature Suites by Kerry Hill",
      "Send Kerry Hill architecture portfolio deck + Zoom call booking",
      "+60 12-200 9834", "thomas.b@expat-solutions.com",
      "German expat, Head of Asia Ops at tech firm. Prefers furnished luxury serviced apartment. Interested in 2-year lease-to-own structure. Wife on board.",
      "2026-09-29"
    ],
    [
      "Puan Sri Hafizah Ismail", "HI", "bg-rose-100",
      "KLCC, Kuala Lumpur", "Legacy Investor", "Medium",
      47, 1950000,
      "8 Conlay Kempinski Branded Residences",
      "Propose dual-unit acquisition for family portfolio gifting",
      "+60 11-889 5501", "hafizah.ismail@trustarc.my",
      "Family trust executive. Evaluating 2 units as generational wealth transfer assets. Needs Shariah-compliant financing proposal. Decision in 6 weeks.",
      "2026-09-27"
    ],
    [
      "Kevin Chan Weng Kit", "KC", "bg-lime-100",
      "Mont Kiara, Kuala Lumpur", "Investor", "Medium",
      38, 1650000,
      "Elmina Ridge Grand Forest Estate",
      "WhatsApp follow-up: send virtual tour video link",
      "+60 16-334 8820", "kevin.chan@propertyclub.my",
      "Young property investor, owns 2 units in Mont Kiara. Looking for landed as portfolio anchor. Biophilic design a strong selling point. Needs SPA review support.",
      "2026-09-25"
    ],
    [
      "Nurul Izzah Hamdan", "NH", "bg-orange-100",
      "Shah Alam, Selangor", "First-Time Luxury Buyer", "Low",
      22, 890000,
      "Sunway Belfield Heritage Suites",
      "Provide mortgage eligibility calculator and refer to recommended banker",
      "+60 19-667 2213", "nurulizzah.h@educorp.edu.my",
      "Academic professional, dual income household. Budget sensitive but loves the Merdeka 118 view. Exploring 90% margin financing. Introduce to CIMB Islamic banker.",
      "2026-09-22"
    ],
    [
      "Alex Leong Jun Wei", "AL", "bg-indigo-100",
      "Iskandar Puteri, Johor", "Ready Buyer", "Low",
      19, 4200000,
      "The Astaka Super Luxury Penthouse",
      "Cold follow-up call — initial enquiry 3 weeks ago via website",
      "+60 12-551 0093", "alex.leong@jbventures.my",
      "JB-based entrepreneur. Visited the showflat last month. Liked it but comparing with The Astaka 2 launch. Price negotiation likely needed. Warm handover from Chloe.",
      "2026-09-18"
    ],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertLead.run(...row);
  });
  insertMany(leads);
  console.log("✓ Seeded", leads.length, "leads for darryl");
} else {
  console.log("ℹ Leads already seeded (", existing.leads, "), skipping.");
}

// ─── 3. Seed Customers (converted/closed deals) for Darryl ───────────────────
if (existing.customers === 0) {
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, email, phone, segment, totalPurchased, unitsOwned, isVip, notes, agentId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'darryl')
  `);

  const customers = [
    // name, email, phone, segment, totalPurchased, unitsOwned, isVip, notes
    [
      "Tan Sri Victor Lim", "victor.lim@limgroup.com.my",
      "+60 12-880 0011", "Platinum Portfolio Client",
      11600000, 3, 1,
      "Owns 3 units under Darryl's portfolio. First closing was The Astaka penthouse. Requires quarterly portfolio performance report. VIP-tier treatment always."
    ],
    [
      "Priya Nambiar", "priya.nambiar@luxeasia.sg",
      "+65 9112 8834", "Luxury Homeowner",
      2850000, 1, 1,
      "Singapore PR, purchased Pavilion Damansara Heights for primary KL residence. Moving in Q4 2026. Requires tenant management referral for earlier investment unit."
    ],
    [
      "Encik Rashdan Mohd Yusof", "rashdan@federalholdings.com",
      "+60 17-334 6650", "Investor",
      6900000, 2, 0,
      "Closed 2 units in Kempinski Branded Residences for hotel-leaseback scheme. Annual yield tracking shared via WhatsApp. Good referral source for government-linked buyers."
    ],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertCustomer.run(...row);
  });
  insertMany(customers);
  console.log("✓ Seeded", customers.length, "customers for darryl");
} else {
  console.log("ℹ Customers already seeded (", existing.customers, "), skipping.");
}

// ─── 4. Summary ───────────────────────────────────────────────────────────────
const final = {
  leads: db.prepare("SELECT COUNT(*) as n FROM leads WHERE agentId='darryl'").get().n,
  customers: db.prepare("SELECT COUNT(*) as n FROM customers WHERE agentId='darryl'").get().n,
  properties: db.prepare("SELECT COUNT(*) as n FROM properties WHERE agentId='darryl'").get().n,
};
console.log("\n📋 Final darryl dashboard state:");
console.log("  Leads:      ", final.leads);
console.log("  Customers:  ", final.customers);
console.log("  Properties: ", final.properties);

db.close();
console.log("\n✅ Done. Darryl agent is fully populated.");

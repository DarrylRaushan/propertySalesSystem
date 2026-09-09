import Database from "better-sqlite3";

const sqlite = new Database("sqlite.db");

const realCustomers = [
  {
    name: "Dato' Lim Wei Ming",
    email: "weiming.lim@email.com",
    phone: "+60 12-111 2222",
    segment: "Investor",
    totalPurchased: 5200000,
    unitsOwned: 6,
    isVip: 1,
    notes: "High-net-worth portfolio investor across Mont Kiara and KLCC properties."
  },
  {
    name: "Puan Sri Aishah Rahman",
    email: "aishah.r@email.com",
    phone: "+60 17-333 4444",
    segment: "Luxury",
    totalPurchased: 3850000,
    unitsOwned: 4,
    isVip: 1,
    notes: "Multi-property owner in Damansara and Bangsar."
  },
  {
    name: "Tan Kok Seng",
    email: "kokseng.tan@email.com",
    phone: "+60 13-555 6666",
    segment: "Investor",
    totalPurchased: 2900000,
    unitsOwned: 3,
    isVip: 1,
    notes: "Focused on high-yield commercial and serviced residential units."
  },
  {
    name: "Devi Nair",
    email: "devi.nair@email.com",
    phone: "+60 19-777 8888",
    segment: "Upgrade",
    totalPurchased: 1550000,
    unitsOwned: 2,
    isVip: 0,
    notes: "Upgraded from Petaling Jaya condo to landed property in Shah Alam."
  },
  {
    name: "Hafiz Ibrahim",
    email: "hafiz.i@email.com",
    phone: "+60 16-999 0000",
    segment: "First-time Buyer",
    totalPurchased: 780000,
    unitsOwned: 1,
    isVip: 0,
    notes: "First-time buyer completed purchase at Asteria Residences."
  },
  {
    name: "Dr. Rachel Chong",
    email: "rachel.chong@email.com",
    phone: "+60 12-888 3333",
    segment: "Luxury",
    totalPurchased: 4200000,
    unitsOwned: 3,
    isVip: 1,
    notes: "Specialist doctor with luxury holdings in Mont Kiara and Bangsar South."
  },
  {
    name: "Kamarul Zaman",
    email: "kamarul.z@email.com",
    phone: "+60 11-222 7777",
    segment: "Upgrade",
    totalPurchased: 1850000,
    unitsOwned: 2,
    isVip: 0,
    notes: "Family upgrader looking at additional suburban landed township units."
  },
  {
    name: "Jessica Teoh",
    email: "jessica.teoh@email.com",
    phone: "+60 18-444 9999",
    segment: "Investor",
    totalPurchased: 2400000,
    unitsOwned: 3,
    isVip: 0,
    notes: "Active Airbnb and tenancy operator in KL central corridor."
  },
  {
    name: "Mohd Fairuz",
    email: "fairuz.m@email.com",
    phone: "+60 14-666 1111",
    segment: "First-time Buyer",
    totalPurchased: 650000,
    unitsOwned: 1,
    isVip: 0,
    notes: "Purchased starter unit in Cyberjaya."
  },
  {
    name: "Grace Wong",
    email: "grace.wong@email.com",
    phone: "+60 13-777 5555",
    segment: "Upgrade",
    totalPurchased: 1420000,
    unitsOwned: 2,
    isVip: 0,
    notes: "Recently completed second property acquisition in Subang."
  }
];

const insertStmt = sqlite.prepare(`
  INSERT INTO customers (name, email, phone, segment, totalPurchased, unitsOwned, isVip, notes, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const deleteStmt = sqlite.prepare("DELETE FROM customers");

sqlite.transaction(() => {
  deleteStmt.run();
  for (const c of realCustomers) {
    insertStmt.run(c.name, c.email, c.phone, c.segment, c.totalPurchased, c.unitsOwned, c.isVip, c.notes);
  }
})();

const count = sqlite.prepare("SELECT count(*) as c FROM customers").get();
console.log(`Successfully seeded ${count.c} real customers into sqlite.db!`);

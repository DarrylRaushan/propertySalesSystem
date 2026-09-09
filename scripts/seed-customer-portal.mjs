/**
 * Seed script: customer_accounts + luxury property enrichment + new portal properties
 * Run with: node --input-type=module scripts/seed-customer-portal.mjs
 */
import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

// ── 1. Seed customer_accounts ─────────────────────────────────────────────
const existingAccounts = db.prepare("SELECT COUNT(*) as cnt FROM customer_accounts").get();
if (existingAccounts.cnt === 0) {
  const insertAccount = db.prepare(`
    INSERT INTO customer_accounts (name, email, password, phone, avatarInitials, segment, budget, preferredLocation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    // Customers
    ["Sarah Tan", "sarah.tan@gmail.com", "sarah123", "+60 12-882 1099", "ST", "High Net Worth Investor", "RM 2,500,000 - RM 4,500,000", "KLCC & Mont Kiara"],
    ["Marcus Wong", "marcus.wong@outlook.com", "marcus123", "+60 16-773 4021", "MW", "First-Time Luxury Homebuyer", "RM 1,200,000 - RM 2,000,000", "Damansara Heights & Bangsar"],
    ["Elena Rostova", "elena.rostova@vip.com", "elena123", "+60 19-332 9988", "ER", "VIP Expat Investor", "RM 3,000,000 - RM 6,000,000", "Ampang Hilir & KL City Centre"],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertAccount.run(...row);
  });
  insertMany(accounts);
  console.log(`✓ Seeded ${accounts.length} customer accounts`);
} else {
  console.log(`ℹ Customer accounts already seeded (${existingAccounts.cnt} rows)`);
}

// ── 2. Enrich existing 30 properties with badge / rentalYield / collection ─
// Map by title substring for robustness
const enrichments = [
  { titleLike: "Kuala Lumpur Tower", badge: "City Landmark", rentalYield: "5.1%", collection: JSON.stringify(["transit"]) },
  { titleLike: "Sungai Buloh Park", badge: "Tranquil Living", rentalYield: "4.7%", collection: JSON.stringify(["ready"]) },
  { titleLike: "Sungai Buloh Green", badge: "New Launch", rentalYield: "5.2%", collection: JSON.stringify(["yield"]) },
  { titleLike: "Petaling Jaya Green", badge: "Prime Township", rentalYield: "4.9%", collection: JSON.stringify(["landed"]) },
  { titleLike: "Mont Kiara Ville", badge: "Expat Favourite", rentalYield: "5.8%", collection: JSON.stringify(["transit", "yield"]) },
  { titleLike: "Sungai Buloh Heights", badge: "Early Bird Offer", rentalYield: "5.3%", collection: JSON.stringify(["yield"]) },
  { titleLike: "Damansara Heights 7", badge: "Limited Units", rentalYield: "5.5%", collection: JSON.stringify(["transit", "yield"]) },
  { titleLike: "Petaling Jaya Heights", badge: "Landed Gem", rentalYield: "4.6%", collection: JSON.stringify(["landed"]) },
  { titleLike: "Kuala Lumpur Heights", badge: "City Premium", rentalYield: "5.0%", collection: JSON.stringify(["transit"]) },
  { titleLike: "Damansara Residences", badge: "Limited Units", rentalYield: "5.6%", collection: JSON.stringify(["yield"]) },
  { titleLike: "Shah Alam Park", badge: "Family Living", rentalYield: "4.5%", collection: JSON.stringify(["landed"]) },
  { titleLike: "Mont Kiara Green", badge: "Luxury High-Rise", rentalYield: "5.9%", collection: JSON.stringify(["penthouses", "yield"]) },
  { titleLike: "Cyberjaya", badge: "Tech Hub", rentalYield: "5.3%", collection: JSON.stringify(["yield"]) },
  { titleLike: "Bangsar", badge: "Heritage District", rentalYield: "5.4%", collection: JSON.stringify(["transit"]) },
  { titleLike: "Ampang", badge: "Embassy Row", rentalYield: "5.1%", collection: JSON.stringify(["transit"]) },
  { titleLike: "KLCC", badge: "Iconic Address", rentalYield: "6.2%", collection: JSON.stringify(["penthouses", "yield", "transit"]) },
  { titleLike: "Subang", badge: "Connectivity Hub", rentalYield: "4.8%", collection: JSON.stringify(["transit"]) },
  { titleLike: "Puchong", badge: "Growing Township", rentalYield: "4.6%", collection: JSON.stringify(["landed"]) },
  { titleLike: "Cheras", badge: "Urban Enclave", rentalYield: "4.9%", collection: JSON.stringify(["transit"]) },
  { titleLike: "Setapak", badge: "Value Pick", rentalYield: "4.7%", collection: JSON.stringify(["ready"]) },
];

const updateProp = db.prepare(`
  UPDATE properties SET badge=?, rentalYield=?, collection=? WHERE title LIKE ?
`);

let enriched = 0;
for (const e of enrichments) {
  const result = updateProp.run(e.badge, e.rentalYield, e.collection, `%${e.titleLike}%`);
  enriched += result.changes;
}
console.log(`✓ Enriched ${enriched} existing properties with badge/yield/collection`);

// ── 3. Insert the 6 luxury Customer Portal properties (if not already present) ─
const luxuryProps = [
  {
    title: "Pavilion Damansara Heights Sky Residence",
    developer: "Pavilion Group",
    location: "Damansara Heights, Kuala Lumpur",
    type: "Condominium",
    status: "Ready to move in",
    price: 2850000,
    beds: 3,
    baths: 3,
    size: "1,850 sq ft",
    description: "An integrated luxury enclave set atop Damansara Heights. Features private lift lobby, seamless underground MRT connectivity, and 500,000 sq ft of bespoke retail dining at your doorstep.",
    features: JSON.stringify(["Private Lift Lobby", "MRT Connectivity", "Concierge", "Pool Deck", "Sky Lounge"]),
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Limited VIP Units",
    rentalYield: "5.8%",
    collection: JSON.stringify(["penthouses", "transit", "ready"]),
  },
  {
    title: "The Conlay Signature Suites by Kerry Hill",
    developer: "Eastern & Oriental (E&O)",
    location: "KLCC, Kuala Lumpur",
    type: "Serviced residence",
    status: "New launch",
    price: 2100000,
    beds: 2,
    baths: 2,
    size: "1,200 sq ft",
    description: "Designed by world-renowned architect Kerry Hill. Heated sky infinity pools, panoramic Royal Selangor Golf Club views, and bespoke concierge hospitality services.",
    features: JSON.stringify(["Sky Infinity Pool", "Kerry Hill Architecture", "Hotel Concierge", "Golf Club View", "Smart Home"]),
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Architectural Icon",
    rentalYield: "6.4%",
    collection: JSON.stringify(["yield", "transit"]),
  },
  {
    title: "Elmina Ridge Grand Forest Estate",
    developer: "Sime Darby Property",
    location: "Shah Alam, Selangor",
    type: "Landed terrace",
    status: "Open for viewing",
    price: 1650000,
    beds: 4,
    baths: 4,
    size: "2,450 sq ft",
    description: "Lush semi-detached sanctuary bordering a 300-acre central park. Solar-ready roofs, rainwater harvesting, EV charging infrastructure, and double-height family atriums.",
    features: JSON.stringify(["300-Acre Park", "Solar-Ready", "EV Charging", "Rainwater Harvesting", "Family Atrium"]),
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Biophilic Design",
    rentalYield: "4.9%",
    collection: JSON.stringify(["landed", "ready"]),
  },
  {
    title: "8 Conlay Kempinski Branded Residences",
    developer: "KSK Land",
    location: "Bukit Bintang, Kuala Lumpur",
    type: "Serviced apartment",
    status: "New launch",
    price: 3450000,
    beds: 3,
    baths: 3,
    size: "1,620 sq ft",
    description: "The tallest twisted twin residential towers in the world. Interior architecture designed by YOO8 inspired by Kelly Hoppen, complete with European 5-star hotel concierge.",
    features: JSON.stringify(["Kempinski Concierge", "YOO8 Interiors", "Sky Observatory", "Twisted Tower Design", "Branded Residence"]),
    imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Kempinski 5-Star Service",
    rentalYield: "6.1%",
    collection: JSON.stringify(["penthouses", "yield", "transit"]),
  },
  {
    title: "Sunway Belfield Heritage Suites",
    developer: "Sunway Property",
    location: "City Centre, Kuala Lumpur",
    type: "Condominium",
    status: "Limited units",
    price: 890000,
    beds: 3,
    baths: 2,
    size: "1,118 sq ft",
    description: "Direct vantage facing the iconic Merdeka 118 tower. 400m walk to Maharajalela Monorail station with co-working sky lounges and rooftop sports deck.",
    features: JSON.stringify(["Merdeka 118 View", "Monorail Access", "Sky Lounge", "Rooftop Sports Deck", "Co-Working Space"]),
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Merdeka 118 View",
    rentalYield: "5.9%",
    collection: JSON.stringify(["transit", "yield"]),
  },
  {
    title: "The Astaka Super Luxury Penthouse",
    developer: "Astaka Holdings",
    location: "Iskandar Puteri, Johor",
    type: "Penthouse",
    status: "Ready to move in",
    price: 4200000,
    beds: 5,
    baths: 6,
    size: "4,350 sq ft",
    description: "Tallest residential skyscraper in Southeast Asia outside Singapore. Private elevators for each unit, floor-to-ceiling Low-E glass, and 15 minutes to RTS transit link.",
    features: JSON.stringify(["Private Elevator", "Low-E Floor-to-Ceiling Glass", "RTS Transit Access", "Singapore Straits View", "Infinity Pool"]),
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
    isActive: 1,
    badge: "Singapore Straits View",
    rentalYield: "5.2%",
    collection: JSON.stringify(["penthouses", "ready"]),
  },
];

const insertProp = db.prepare(`
  INSERT OR IGNORE INTO properties (title, developer, location, type, status, price, beds, baths, size, description, features, imageUrl, isActive, badge, rentalYield, collection)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
for (const p of luxuryProps) {
  const result = insertProp.run(
    p.title, p.developer, p.location, p.type, p.status, p.price,
    p.beds, p.baths, p.size, p.description, p.features, p.imageUrl,
    p.isActive, p.badge, p.rentalYield, p.collection
  );
  if (result.changes > 0) inserted++;
}
console.log(`✓ Inserted ${inserted} luxury Customer Portal properties`);

// Final count
const finalProps = db.prepare("SELECT COUNT(*) as cnt FROM properties").get();
const finalAccounts = db.prepare("SELECT COUNT(*) as cnt FROM customer_accounts").get();
console.log(`\n📦 Final DB state:`);
console.log(`   properties: ${finalProps.cnt}`);
console.log(`   customer_accounts: ${finalAccounts.cnt}`);

db.close();
console.log("\n✅ Seed complete!");

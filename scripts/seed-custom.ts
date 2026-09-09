import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { properties, leads, pipelineStages, salesTrend, enquirySources, followUpHealth, users } from "../drizzle/schema.ts";

async function main() {
  console.log("Connecting to SQLite database...");
  const sqlite = new Database("sqlite.db");
  const db = drizzle(sqlite);

  console.log("Clearing existing data...");
  await db.delete(leads);
  await db.delete(properties);
  await db.delete(pipelineStages);
  await db.delete(salesTrend);
  await db.delete(enquirySources);
  await db.delete(followUpHealth);
  await db.delete(users);

  console.log("Generating 30 realistic properties...");
  const devList = ["Mah Sing Group", "Sime Darby", "UEM Sunrise", "EcoWorld", "IJM Land"];
  const locList = ["Kuala Lumpur", "Petaling Jaya, Selangor", "Damansara, Selangor", "Sungai Buloh, Selangor", "Mont Kiara, KL"];
  const typeList = ["Condominium", "Serviced residence", "Serviced apartment", "Landed terrace"];
  const statusList = ["Open for viewing", "New launch", "Limited units", "Ready to move in", "Early bird offer"];

  const insertedProperties = [];
  for (let i = 1; i <= 30; i++) {
    const loc = locList[Math.floor(Math.random() * locList.length)];
    const type = typeList[Math.floor(Math.random() * typeList.length)];
    const beds = type.includes("Landed") ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 3) + 1;
    const price = beds * 250000 + Math.floor(Math.random() * 200000);
    const size = beds * 350 + Math.floor(Math.random() * 200) + " sq ft";
    
    // Add realistic titles based on location
    const titles = ["Residences", "Suites", "Green", "Ville", "Heights", "Park", "Tower", "Manor"];
    const title = `${loc.split(',')[0]} ${titles[Math.floor(Math.random() * titles.length)]} ${i}`;
    
    // Unsplash architecture images
    const images = [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop"
    ];

    const result = await db.insert(properties).values({
      title: title,
      developer: devList[Math.floor(Math.random() * devList.length)],
      location: loc,
      type: type,
      status: statusList[Math.floor(Math.random() * statusList.length)],
      price: price,
      beds: beds,
      baths: Math.max(1, beds - 1),
      size: size,
      description: "A beautiful property located in the heart of " + loc,
      imageUrl: images[Math.floor(Math.random() * images.length)],
      isActive: true
    }).returning({ id: properties.id });
    
    insertedProperties.push({ id: result[0].id, title, loc, price });
  }

  console.log("Generating 128 realistic leads...");
  const firstNames = ["Aiman", "Sarah", "Muhammad", "Joanne", "Ravi", "Farah", "Kelvin", "Nurul", "Wei", "Mei", "Ali", "Siti"];
  const lastNames = ["Faris", "Lim", "Zaki", "Chong", "Nair", "Ahmad", "Tan", "Abdullah", "Chen", "Wong", "Hassan", "Lee"];
  const segments = ["Ready Buyer", "Investor", "Researcher", "Low Engagement"];
  const actions = ["Schedule viewing", "Send yield analysis", "Share loan estimate", "Follow up in 2 days", "Share new launch deck"];
  const accents = [
    "bg-[#dbe9f8] text-[#24486b]", 
    "bg-[#e8e2f5] text-[#60468e]", 
    "bg-[#dff0e6] text-[#2e6a4b]", 
    "bg-[#faecd4] text-[#8b5a20]", 
    "bg-[#e6edf4] text-[#456176]"
  ];

  for (let i = 1; i <= 128; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const prop = insertedProperties[Math.floor(Math.random() * insertedProperties.length)];
    const priority = Math.random() > 0.8 ? "High" : Math.random() > 0.4 ? "Medium" : "Low";
    let prob = Math.floor(Math.random() * 100);
    if (priority === "High") prob = Math.floor(Math.random() * 20) + 80;
    
    await db.insert(leads).values({
      name: `${fn} ${ln}`,
      initials: `${fn[0]}${ln[0]}`,
      accent: accents[Math.floor(Math.random() * accents.length)],
      location: prop.loc,
      segment: segments[Math.floor(Math.random() * segments.length)],
      priority: priority,
      probability: prob,
      value: prop.price,
      property: prop.title,
      action: actions[Math.floor(Math.random() * actions.length)],
      phone: "+601" + Math.floor(Math.random() * 100000000),
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`
    });
  }

  console.log("Inserting Pipeline Funnel stats...");
  await db.insert(pipelineStages).values([
    { name: "Enquiries", count: 428, conversionRate: 100 },
    { name: "Qualified", count: 164, conversionRate: 38.3 },
    { name: "Bookings", count: 18, conversionRate: 11.0 },
  ]);

  console.log("Inserting Sales Trend data...");
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const baseValue = 12000000;
  for (let i = 0; i < months.length; i++) {
    await db.insert(salesTrend).values({
      month: months[i],
      value: baseValue + (i * 500000) + Math.floor(Math.random() * 1000000),
      year: i < 2 ? 2023 : 2024
    });
  }

  console.log("Inserting Enquiry Sources...");
  await db.insert(enquirySources).values([
    { source: "Organic enquiries", count: 168, percentage: 39.25 },
    { source: "Portal campaigns", count: 124, percentage: 28.97 },
    { source: "Referrals", count: 82, percentage: 19.16 },
    { source: "WhatsApp follow-up", count: 54, percentage: 12.62 },
  ]);

  console.log("Inserting Follow-Up Health metrics...");
  await db.insert(followUpHealth).values([
    { metric: "Scheduled", value: 82, label: "Scheduled", sub: "of 24 priority leads" },
    { metric: "Contacted this week", value: 64, label: "Contacted this week", sub: "response within 48h" },
  ]);
  
  console.log("Adding mock admin user...");
  await db.insert(users).values({
    openId: "mock-admin-id",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin"
  });

  console.log("Seeding complete! Local SQLite database ready.");
}

main().catch(console.error);

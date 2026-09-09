import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from env (already injected)
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not found.");
  process.exit(1);
}

async function main() {
  console.log("Seeding database...");

  // Use mysql2/promise directly for seed
  const connection = await mysql.createConnection(DB_URL);

  // Check if data already exists
  const [existing] = await connection.query("SELECT COUNT(*) as count FROM leads");
  if (existing[0].count > 0) {
    console.log("Database already has data. Skipping seed.");
    await connection.end();
    process.exit(0);
  }

  // Seed Leads
  const leadData = [
    { name: "Aiman Faris", initials: "AF", accent: "bg-[#dbe7f4] text-[#34588c]", location: "Petaling Jaya, Selangor", segment: "Ready Buyer", priority: "High", probability: 92, value: "1250000", property: "Asteria Residences", action: "Schedule viewing", phone: "+60 12-345 6789", email: "aiman.faris@email.com" },
    { name: "Sarah Lim", initials: "SL", accent: "bg-[#e8e0f0] text-[#6b4c8a]", location: "Mont Kiara, Kuala Lumpur", segment: "Investor", priority: "High", probability: 87, value: "980000", property: "The Mews KL", action: "Send yield analysis", phone: "+60 17-654 3210", email: "sarah.lim@email.com" },
    { name: "Muhammad Zaki", initials: "MZ", accent: "bg-[#e0efe4] text-[#3d7a52]", location: "Shah Alam, Selangor", segment: "Ready Buyer", priority: "High", probability: 78, value: "760000", property: "Elmina Green", action: "Share loan estimate", phone: "+60 19-876 5432", email: "zaki.m@email.com" },
    { name: "Priya Nair", initials: "PN", accent: "bg-[#fde8e8] text-[#a04040]", location: "Bangsar, Kuala Lumpur", segment: "Ready Buyer", priority: "High", probability: 85, value: "1450000", property: "KL Eco City", action: "Schedule site visit", phone: "+60 16-234 5678", email: "priya.nair@email.com" },
    { name: "Wei Chen Tan", initials: "WT", accent: "bg-[#e8f0f4] text-[#3d6b8a]", location: "Cyberjaya, Selangor", segment: "Investor", priority: "High", probability: 82, value: "890000", property: "Tamarind Square", action: "Send ROI breakdown", phone: "+60 13-987 6543", email: "weichen.tan@email.com" },
    { name: "Nurul Aisyah", initials: "NA", accent: "bg-[#f0e8f4] text-[#7a4c8a]", location: "Kuchai Lama, Kuala Lumpur", segment: "Ready Buyer", priority: "Medium", probability: 65, value: "620000", property: "Arte Plus", action: "Follow up call", phone: "+60 11-456 7890", email: "nurul.aisyah@email.com" },
    { name: "Raj Kumar", initials: "RK", accent: "bg-[#f4f0e0] text-[#8a7a3d]", location: "Subang Jaya, Selangor", segment: "Investor", priority: "Medium", probability: 58, value: "1100000", property: "The Icon", action: "Send market report", phone: "+60 14-567 8901", email: "raj.k@email.com" },
    { name: "Jasmine Wong", initials: "JW", accent: "bg-[#e0f0f0] text-[#3d8a7a]", location: "Cheras, Kuala Lumpur", segment: "Researcher", priority: "Medium", probability: 45, value: "480000", property: "Sunway Velocity", action: "Share brochure", phone: "+60 15-678 9012", email: "jasmine.wong@email.com" },
    { name: "Ahmad Razif", initials: "AR", accent: "bg-[#f0f4e0] text-[#6a8a3d]", location: "Kajang, Selangor", segment: "Ready Buyer", priority: "Medium", probability: 52, value: "550000", property: "Semenyih Heights", action: "Schedule viewing", phone: "+60 18-789 0123", email: "ahmad.razif@email.com" },
    { name: "Michelle Ong", initials: "MO", accent: "bg-[#f4e0e8] text-[#8a3d6a]", location: "Ampang, Kuala Lumpur", segment: "Investor", priority: "Low", probability: 32, value: "720000", property: "Ampang Park Residences", action: "Nurture sequence", phone: "+60 12-890 1234", email: "michelle.ong@email.com" },
    { name: "Suresh Pillai", initials: "SP", accent: "bg-[#e8e8f4] text-[#5a5a8a]", location: "Puchong, Selangor", segment: "Researcher", priority: "Low", probability: 28, value: "410000", property: "Bandar Puteri", action: "Add to newsletter", phone: "+60 17-901 2345", email: "suresh.p@email.com" },
    { name: "Fatimah Zahra", initials: "FZ", accent: "bg-[#e0f4e8] text-[#3d8a5a]", location: "Rawang, Selangor", segment: "Researcher", priority: "Low", probability: 22, value: "380000", property: "Country Heights", action: "Send area guide", phone: "+60 19-012 3456", email: "fatimah.z@email.com" },
  ];

  for (const lead of leadData) {
    await connection.execute(
      "INSERT INTO leads (name, initials, accent, location, segment, priority, probability, value, property, action, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [lead.name, lead.initials, lead.accent, lead.location, lead.segment, lead.priority, lead.probability, lead.value, lead.property, lead.action, lead.phone, lead.email]
    );
  }
  console.log(`  ✓ Inserted ${leadData.length} leads`);

  // Seed Properties
  const propertyData = [
    { title: "Asteria Residences", developer: "Gamuda Land", location: "Petaling Jaya, Selangor", type: "High-rise Condo", status: "For Sale", price: "1250000", beds: 3, baths: 2, size: "1,200 sqft", description: "Premium luxury residences with panoramic city views", features: JSON.stringify(["Gym", "Pool", "Concierge", "EV Charging"]), isActive: 1 },
    { title: "The Mews KL", developer: "YTL Land", location: "Mont Kiara, Kuala Lumpur", type: "Serviced Apartment", status: "For Sale", price: "980000", beds: 2, baths: 2, size: "980 sqft", description: "International-standard living in the heart of Mont Kiara", features: JSON.stringify(["Clubhouse", "Sky Lounge", "Retail Podium"]), isActive: 1 },
    { title: "Elmina Green", developer: "Sime Darby Property", location: "Shah Alam, Selangor", type: "Semi-Detached", status: "For Sale", price: "760000", beds: 4, baths: 3, size: "2,400 sqft", description: "Green living in a master-planned township", features: JSON.stringify(["Garden", "Guarded", "Parks", "Schools"]), isActive: 1 },
    { title: "KL Eco City", developer: "SP Setia", location: "Bangsar, Kuala Lumpur", type: "High-rise Condo", status: "For Sale", price: "1450000", beds: 3, baths: 3, size: "1,500 sqft", description: "Transit-oriented development with direct LRT access", features: JSON.stringify(["LRT Access", "Mall", "Office Tower", "Sky Pool"]), isActive: 1 },
    { title: "Tamarind Square", developer: "Cyberview", location: "Cyberjaya, Selangor", type: "Serviced Suite", status: "For Sale", price: "890000", beds: 2, baths: 2, size: "850 sqft", description: "The commercial hub of Cyberjaya with retail below", features: JSON.stringify(["Retail", "Transit Hub", "Offices", "Hotel"]), isActive: 1 },
    { title: "Arte Plus", developer: "Arte Plus", location: "Kuchai Lama, Kuala Lumpur", type: "High-rise Condo", status: "For Sale", price: "620000", beds: 2, baths: 1, size: "750 sqft", description: "Art-inspired living with striking facade design", features: JSON.stringify(["Art Gallery", "Infinity Pool", "Gym"]), isActive: 1 },
    { title: "The Icon", developer: "Icon City", location: "Subang Jaya, Selangor", type: "High-rise Condo", status: "For Sale", price: "1100000", beds: 3, baths: 2, size: "1,100 sqft", description: "Dual-key units ideal for investment and rental", features: JSON.stringify(["Dual Key", "Rooftop", "Concierge"]), isActive: 1 },
    { title: "Sunway Velocity", developer: "Sunway Group", location: "Cheras, Kuala Lumpur", type: "Mixed Development", status: "Sold Out", price: "480000", beds: 2, baths: 1, size: "680 sqft", description: "Integrated mall, hotel, and residences at Maluri", features: JSON.stringify(["Mall Access", "Metro", "Medical Centre"]), isActive: 0 },
    { title: "Semenyih Heights", developer: "EcoWorld", location: "Kajang, Selangor", type: "Terrace House", status: "For Sale", price: "550000", beds: 3, baths: 2, size: "1,800 sqft", description: "Affordable family homes in a growing township", features: JSON.stringify(["Clubhouse", "Parks", "Schools Nearby"]), isActive: 1 },
    { title: "Ampang Park Residences", developer: "UEM Sunrise", location: "Ampang, Kuala Lumpur", type: "High-rise Condo", status: "For Sale", price: "720000", beds: 2, baths: 2, size: "900 sqft", description: "Modern living steps from Ampang Park LRT", features: JSON.stringify(["LRT Access", "Pool", "Gym", "BBQ Area"]), isActive: 1 },
  ];

  for (const prop of propertyData) {
    await connection.execute(
      "INSERT INTO properties (title, developer, location, type, status, price, beds, baths, size, description, features, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [prop.title, prop.developer, prop.location, prop.type, prop.status, prop.price, prop.beds, prop.baths, prop.size, prop.description, prop.features, prop.isActive]
    );
  }
  console.log(`  ✓ Inserted ${propertyData.length} properties`);

  // Seed Customers
  const customerData = [
    { name: "Dato' Lim Wei Ming", email: "weiming.lim@email.com", phone: "+60 12-111 2222", segment: "Investor", totalPurchased: "5200000", unitsOwned: 6, isVip: 1 },
    { name: "Puan Sri Aishah", email: "aishah.r@email.com", phone: "+60 17-333 4444", segment: "Ready Buyer", totalPurchased: "3800000", unitsOwned: 4, isVip: 1 },
    { name: "Mr. Tan Kok Seng", email: "kokseng.tan@email.com", phone: "+60 13-555 6666", segment: "Investor", totalPurchased: "2900000", unitsOwned: 3, isVip: 1 },
    { name: "Ms. Devi Nair", email: "devi.nair@email.com", phone: "+60 19-777 8888", segment: "Ready Buyer", totalPurchased: "1500000", unitsOwned: 2, isVip: 0 },
    { name: "Mr. Hafiz Ibrahim", email: "hafiz.i@email.com", phone: "+60 16-999 0000", segment: "Ready Buyer", totalPurchased: "1200000", unitsOwned: 1, isVip: 0 },
  ];

  for (const cust of customerData) {
    await connection.execute(
      "INSERT INTO customers (name, email, phone, segment, totalPurchased, unitsOwned, isVip) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [cust.name, cust.email, cust.phone, cust.segment, cust.totalPurchased, cust.unitsOwned, cust.isVip]
    );
  }
  console.log(`  ✓ Inserted ${customerData.length} customers`);

  // Seed Pipeline Stages
  const pipelineData = [
    { name: "Enquiries", count: 428, conversionRate: 38.3, period: "current" },
    { name: "Qualified", count: 164, conversionRate: 11.0, period: "current" },
    { name: "Bookings", count: 18, conversionRate: 4.2, period: "current" },
  ];

  for (const stage of pipelineData) {
    await connection.execute(
      "INSERT INTO pipeline_stages (name, count, conversionRate, period) VALUES (?, ?, ?, ?)",
      [stage.name, stage.count, stage.conversionRate, stage.period]
    );
  }
  console.log(`  ✓ Inserted ${pipelineData.length} pipeline stages`);

  // Seed Sales Trend
  const trendData = [
    { month: "Nov", value: "8200000", year: 2023 },
    { month: "Dec", value: "7800000", year: 2023 },
    { month: "Jan", value: "9100000", year: 2024 },
    { month: "Feb", value: "8700000", year: 2024 },
    { month: "Mar", value: "9500000", year: 2024 },
    { month: "Apr", value: "10200000", year: 2024 },
    { month: "May", value: "11800000", year: 2024 },
    { month: "Jun", value: "12400000", year: 2024 },
    { month: "Jul", value: "13100000", year: 2024 },
    { month: "Aug", value: "14200000", year: 2024 },
    { month: "Sep", value: "15800000", year: 2024 },
    { month: "Oct", value: "18400000", year: 2024 },
  ];

  for (const trend of trendData) {
    await connection.execute(
      "INSERT INTO sales_trend (month, value, year) VALUES (?, ?, ?)",
      [trend.month, trend.value, trend.year]
    );
  }
  console.log(`  ✓ Inserted ${trendData.length} sales trend records`);

  // Seed Enquiry Sources
  const sourceData = [
    { source: "Organic enquiries", count: 148, percentage: 35, period: "current" },
    { source: "Portal campaigns", count: 121, percentage: 28, period: "current" },
    { source: "Referrals", count: 94, percentage: 22, period: "current" },
    { source: "WhatsApp follow-up", count: 64, percentage: 15, period: "current" },
  ];

  for (const source of sourceData) {
    await connection.execute(
      "INSERT INTO enquiry_sources (source, count, percentage, period) VALUES (?, ?, ?, ?)",
      [source.source, source.count, source.percentage, source.period]
    );
  }
  console.log(`  ✓ Inserted ${sourceData.length} enquiry sources`);

  // Seed Follow-up Health
  const healthData = [
    { metric: "scheduled", value: 82, label: "Scheduled", sub: "of 24 priority leads", period: "current" },
    { metric: "contacted", value: 64, label: "Contacted this week", sub: "response within 48h", period: "current" },
  ];

  for (const health of healthData) {
    await connection.execute(
      "INSERT INTO follow_up_health (metric, value, label, sub, period) VALUES (?, ?, ?, ?, ?)",
      [health.metric, health.value, health.label, health.sub, health.period]
    );
  }
  console.log(`  ✓ Inserted ${healthData.length} follow-up health records`);

  console.log("\n✓ Database seeded successfully!");
  await connection.end();
}

main().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});

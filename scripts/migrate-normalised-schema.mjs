import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');

console.log('--- Applying Normalised Schema Migration ---');

// Helper to safely add column
function addColumnIfNotExists(table, columnDef) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run();
    console.log(`Added column ${columnDef} to ${table}`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn(`Note on ${table} (${columnDef}):`, err.message);
    }
  }
}

// 1. Update Users table structure
addColumnIfNotExists('users', 'agentCode TEXT');
addColumnIfNotExists('users', 'phone TEXT');
addColumnIfNotExists('users', 'specialization TEXT');

// Ensure unique index on agentCode
try {
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_agent_code ON users(agentCode)').run();
} catch (e) {
  console.warn(e.message);
}

// Seed the 3 agents and admin
const upsertUser = db.prepare(`
  INSERT INTO users (openId, agentCode, name, email, phone, role, specialization, lastSignedIn)
  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(openId) DO UPDATE SET
    agentCode = excluded.agentCode,
    name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
    specialization = excluded.specialization
`);

upsertUser.run('hannah', 'hannah', 'Hannah Cheong', 'hannah@properly.my', '+60 12-345 6789', 'agent', 'Prime High-Rise & Luxury Developments');
upsertUser.run('amir', 'amir', 'Amir Rahman', 'amir@properly.my', '+60 11-234 5678', 'agent', 'High-Yield Portfolios & Landed Estates');
upsertUser.run('chloe', 'chloe', 'Chloe Tan', 'chloe@properly.my', '+60 17-890 1234', 'agent', 'New Launch Campaigns & VIP Expats');
upsertUser.run('mock-admin-id', 'admin', 'Admin User', 'admin@example.com', '+60 12-000 0000', 'admin', 'Brokerage Operations');

// 2. Normalise properties (add agentId FK)
addColumnIfNotExists('properties', 'agentId TEXT REFERENCES users(agentCode)');
const allProperties = db.prepare('SELECT id, location FROM properties').all();
const updatePropAgent = db.prepare('UPDATE properties SET agentId = ? WHERE id = ?');
for (const p of allProperties) {
  let agent = 'hannah';
  const loc = (p.location || '').toLowerCase();
  if (loc.includes('johor') || loc.includes('iskandar')) agent = 'chloe';
  else if (loc.includes('shah alam') || loc.includes('selangor')) agent = (p.id % 2 === 0) ? 'amir' : 'hannah';
  else if (loc.includes('mont kiara') || loc.includes('klcc') || loc.includes('damansara')) agent = (p.id % 3 === 0) ? 'chloe' : 'hannah';
  updatePropAgent.run(agent, p.id);
}

// 3. Normalise customers (add agentId FK and leadId FK)
addColumnIfNotExists('customers', 'agentId TEXT REFERENCES users(agentCode)');
addColumnIfNotExists('customers', 'leadId INTEGER REFERENCES leads(id)');
const allCustomers = db.prepare('SELECT id, segment, notes FROM customers').all();
const updateCust = db.prepare('UPDATE customers SET agentId = ?, leadId = ? WHERE id = ?');
for (const c of allCustomers) {
  let agent = 'hannah';
  if (c.id % 3 === 1) agent = 'hannah';
  else if (c.id % 3 === 2) agent = 'amir';
  else agent = 'chloe';
  
  // Link to a sample lead
  const leadId = (c.id * 7) % 120 + 1;
  updateCust.run(agent, leadId, c.id);
}

// 4. Normalise customer_accounts (add assignedAgentId FK and preferences)
addColumnIfNotExists('customer_accounts', 'assignedAgentId TEXT REFERENCES users(agentCode)');
addColumnIfNotExists('customer_accounts', 'preferredTypes TEXT');
addColumnIfNotExists('customer_accounts', 'minBeds INTEGER DEFAULT 0');
addColumnIfNotExists('customer_accounts', 'investmentGoal TEXT');
addColumnIfNotExists('customer_accounts', 'preferredFeatures TEXT');
const allAccs = db.prepare('SELECT id FROM customer_accounts').all();
const updateAcc = db.prepare('UPDATE customer_accounts SET assignedAgentId = ? WHERE id = ?');
const agentCodes = ['hannah', 'amir', 'chloe'];
for (const a of allAccs) {
  updateAcc.run(agentCodes[a.id % agentCodes.length], a.id);
}

// 5. Normalise analytics tables
addColumnIfNotExists('pipeline_stages', 'agentId TEXT REFERENCES users(agentCode)');
addColumnIfNotExists('sales_trend', 'agentId TEXT REFERENCES users(agentCode)');
addColumnIfNotExists('enquiry_sources', 'agentId TEXT REFERENCES users(agentCode)');
addColumnIfNotExists('follow_up_health', 'agentId TEXT REFERENCES users(agentCode)');

console.log('Migration completed successfully!');

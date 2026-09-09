import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');

console.log('Distributing 128 leads across Hannah, Amir, and Chloe...');

const allLeads = db.prepare('SELECT id, location, segment, property FROM leads').all();

const updateStmt = db.prepare('UPDATE leads SET agentId = ? WHERE id = ?');

let hannahCount = 0;
let amirCount = 0;
let chloeCount = 0;

for (const lead of allLeads) {
  let agent = 'hannah';
  const loc = (lead.location || '').toLowerCase();
  const seg = (lead.segment || '').toLowerCase();
  const prop = (lead.property || '').toLowerCase();

  if (loc.includes('johor') || loc.includes('iskandar') || loc.includes('cyberjaya') || prop.includes('utm') || prop.includes('mutiara')) {
    agent = 'chloe';
  } else if (loc.includes('shah alam') || loc.includes('selangor') || seg.includes('investor') || prop.includes('elmina')) {
    agent = (lead.id % 2 === 0) ? 'amir' : 'hannah';
  } else if (loc.includes('mont kiara') || loc.includes('klcc') || loc.includes('damansara') || loc.includes('bangsar') || seg.includes('luxury') || seg.includes('ready buyer')) {
    agent = (lead.id % 3 === 0) ? 'chloe' : 'hannah';
  } else {
    // Round robin fallback
    const agents = ['hannah', 'amir', 'chloe'];
    agent = agents[lead.id % agents.length];
  }

  updateStmt.run(agent, lead.id);
  if (agent === 'hannah') hannahCount++;
  else if (agent === 'amir') amirCount++;
  else chloeCount++;
}

console.log(`Distribution complete:
- Hannah Cheong: ${hannahCount} leads
- Amir Rahman: ${amirCount} leads
- Chloe Tan: ${chloeCount} leads
Total: ${hannahCount + amirCount + chloeCount} leads`);

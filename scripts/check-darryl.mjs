import Database from "better-sqlite3";
const db = new Database("./sqlite.db");

const props = db.prepare("SELECT id, title, agentId FROM properties WHERE agentId='darryl'").all();
console.log('DARRYL PROPERTIES:', JSON.stringify(props, null, 2));

const custs = db.prepare("SELECT id, name, agentId FROM customers WHERE agentId='darryl'").all();
console.log('DARRYL CUSTOMERS:', JSON.stringify(custs, null, 2));

const propsNull = db.prepare("SELECT COUNT(*) as c FROM properties WHERE agentId IS NULL").get();
console.log('PROPS WITH NO AGENT:', propsNull);

const allCustomers = db.prepare("SELECT id, name, agentId FROM customers").all();
console.log('ALL CUSTOMERS:', JSON.stringify(allCustomers, null, 2));

db.close();

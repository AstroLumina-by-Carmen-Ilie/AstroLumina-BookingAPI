import axios from 'axios';
import 'dotenv/config';

const D1_ACCOUNT_ID = process.env.D1_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const D1_API_TOKEN = process.env.D1_API_TOKEN;

if (!D1_ACCOUNT_ID || !D1_DATABASE_ID || !D1_API_TOKEN) {
  console.error('Missing D1 config: D1_ACCOUNT_ID, D1_DATABASE_ID, D1_API_TOKEN');
  process.exit(1);
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS event_attendees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  payment_intent_id TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_intent ON event_attendees(payment_intent_id);
`;

async function migrate() {
  console.log('Running D1 migration...');

  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${D1_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
      { sql: CREATE_TABLE_SQL },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${D1_API_TOKEN}`,
        },
      }
    );

    if (response.data.success) {
      console.log('Table event_attendees created successfully');
    } else {
      console.error('Migration failed:', response.data.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
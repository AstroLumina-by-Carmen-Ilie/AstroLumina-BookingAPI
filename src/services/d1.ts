import axios from 'axios';
import { env } from '../config/env.js';

const MAX_SEATS = 20;

interface D1QueryResult {
  results: Array<Record<string, unknown>>;
}

export interface Attendee {
  id: number;
  event_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  payment_intent_id: string | null;
  created_at: string;
}

async function queryD1(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
  if (!env.D1_ACCOUNT_ID || !env.D1_DATABASE_ID || !env.D1_API_TOKEN) {
    throw new Error('D1 not configured: missing D1_ACCOUNT_ID, D1_DATABASE_ID, or D1_API_TOKEN');
  }

  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${env.D1_ACCOUNT_ID}/d1/${env.D1_DATABASE_ID}/query`,
    { sql, params },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.D1_API_TOKEN}`,
      },
    }
  );

  return response.data.result;
}

export async function getAvailableSeats(eventId: string): Promise<number> {
  const result = await queryD1(
    'SELECT COUNT(*) as booked FROM event_attendees WHERE event_id = ?',
    [eventId]
  );

  const booked = (result.results[0]?.booked as number) ?? 0;
  return MAX_SEATS - booked;
}

export async function getEventAttendees(eventId: string): Promise<Attendee[]> {
  const result = await queryD1(
    'SELECT * FROM event_attendees WHERE event_id = ? ORDER BY created_at DESC',
    [eventId]
  );

  return result.results as unknown as Attendee[];
}

export async function addAttendee(
  eventId: string,
  fullName: string,
  email: string | null,
  phone: string | null,
  paymentIntentId: string | null
): Promise<number> {
  await queryD1(
    `INSERT INTO event_attendees (event_id, full_name, email, phone, payment_intent_id)
     VALUES (?, ?, ?, ?, ?)`,
    [eventId, fullName, email, phone, paymentIntentId]
  );

  return 1;
}

export async function getAttendeeByPaymentIntent(paymentIntentId: string): Promise<Attendee | null> {
  const result = await queryD1(
    'SELECT * FROM event_attendees WHERE payment_intent_id = ? LIMIT 1',
    [paymentIntentId]
  );

  return result.results[0] as unknown as Attendee;
}

export { MAX_SEATS };
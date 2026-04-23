import axios from 'axios';
import { env } from '../config/env.js';

const MAX_SEATS = 20;

interface D1Response {
  success: boolean;
  result?: unknown[];
  errors?: Array<{ code: number; message: string }>;
  messages?: Array<{ type: string; content: string }>;
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

// In-memory fallback storage when D1 is unavailable
const inMemoryStorage: Map<string, Attendee[]> = new Map();

async function queryD1(sql: string, params: unknown[] = []): Promise<D1Response> {
  if (!env.D1_ACCOUNT_ID || !env.D1_DATABASE_ID || !env.D1_API_TOKEN) {
    throw new Error('D1 not configured');
  }

  try {
    const response = await axios.post<D1Response>(
      `https://api.cloudflare.com/client/v4/accounts/${env.D1_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`,
      { sql, params },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.D1_API_TOKEN}`,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.errors?.[0]?.message || error.message;
      throw new Error(`D1 API error: ${message}`);
    }
    throw error;
  }
}

export async function getAvailableSeats(eventId: string): Promise<number> {
  try {
    const result = await queryD1(
      'SELECT COUNT(*) as booked FROM event_attendees WHERE event_id = ?',
      [eventId]
    );

    if (!result.success || !result.result) {
      throw new Error('D1 query returned invalid response');
    }

    const firstResult = result.result[0] as Record<string, unknown> | undefined;
    const booked = (firstResult?.booked as number) ?? 0;
    return MAX_SEATS - booked;
  } catch (error) {
    console.warn('D1 unavailable, using in-memory fallback');
    // Fallback to in-memory storage
    const attendees = inMemoryStorage.get(eventId) || [];
    return MAX_SEATS - attendees.length;
  }
}

export async function getEventAttendees(eventId: string): Promise<Attendee[]> {
  try {
    const result = await queryD1(
      'SELECT * FROM event_attendees WHERE event_id = ? ORDER BY created_at DESC',
      [eventId]
    );

    if (!result.success || !result.result) {
      throw new Error('D1 query returned invalid response');
    }

    return result.result as unknown as Attendee[];
  } catch (error) {
    console.warn('D1 unavailable, using in-memory fallback');
    return inMemoryStorage.get(eventId) || [];
  }
}

export async function addAttendee(
  eventId: string,
  fullName: string,
  email: string | null,
  phone: string | null,
  paymentIntentId: string | null
): Promise<number> {
  try {
    const result = await queryD1(
      `INSERT INTO event_attendees (event_id, full_name, email, phone, payment_intent_id)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, fullName, email, phone, paymentIntentId]
    );

    if (!result.success) {
      throw new Error('D1 insert failed');
    }

    // Add to in-memory for consistency
    const attendees = inMemoryStorage.get(eventId) || [];
    const newAttendee: Attendee = {
      id: Date.now(),
      event_id: eventId,
      full_name: fullName,
      email,
      phone,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString(),
    };
    attendees.push(newAttendee);
    inMemoryStorage.set(eventId, attendees);

    return newAttendee.id;
  } catch (error) {
    console.warn('D1 unavailable, using in-memory fallback');
    // Fallback to in-memory storage only
    const attendees = inMemoryStorage.get(eventId) || [];
    const newAttendee: Attendee = {
      id: Date.now(),
      event_id: eventId,
      full_name: fullName,
      email,
      phone,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString(),
    };
    attendees.push(newAttendee);
    inMemoryStorage.set(eventId, attendees);
    return newAttendee.id;
  }
}

export async function getAttendeeByPaymentIntent(paymentIntentId: string): Promise<Attendee | null> {
  try {
    const result = await queryD1(
      'SELECT * FROM event_attendees WHERE payment_intent_id = ? LIMIT 1',
      [paymentIntentId]
    );

    if (!result.success || !result.result) {
      throw new Error('D1 query returned invalid response');
    }

    return result.result[0] as unknown as Attendee;
  } catch (error) {
    console.warn('D1 unavailable, using in-memory fallback');
    // Search in-memory storage
    for (const attendees of inMemoryStorage.values()) {
      const found = attendees.find(a => a.payment_intent_id === paymentIntentId);
      if (found) return found;
    }
    return null;
  }
}

export { MAX_SEATS };
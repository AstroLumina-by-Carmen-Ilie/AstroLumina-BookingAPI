import axios from "axios";
import { env } from "../config/env.js";
import { Sentry } from "../instrument.js";

const MAX_SEATS = 20;

export interface Attendee {
  id: number;
  event_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  payment_intent_id: string | null;
  created_at: string;
}

async function queryD1(sql: string, params: unknown[] = []) {
  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${env.D1_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`,
    { sql, params },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.D1_API_TOKEN}`,
      },
      timeout: 10000,
    },
  );

  return response.data;
}

export async function getAvailableSeats(eventId: string): Promise<number> {
  const result = await queryD1(
    "SELECT COALESCE(COUNT(*), 0) as booked FROM event_attendees WHERE event_id = ?",
    [eventId],
  );

  if (!result.success) {
    Sentry.captureException(new Error("D1 query failed"), {
      tags: { function: "getAvailableSeats" },
    });
    throw new Error("D1 query failed");
  }

  // COUNT(*) returns exactly one row (0 when the table is empty), but coerce
  // defensively so `MAX_SEATS - booked` always operates on an integer.
  const raw = result.result?.[0]?.results?.[0]?.booked;
  const booked =
    raw === null || raw === undefined || Number.isNaN(Number(raw))
      ? 0
      : Math.max(0, Math.trunc(Number(raw)));
  return MAX_SEATS - booked;
}

export async function getEventAttendees(eventId: string): Promise<Attendee[]> {
  const result = await queryD1(
    "SELECT * FROM event_attendees WHERE event_id = ? ORDER BY created_at DESC",
    [eventId],
  );

  if (!result.success) {
    Sentry.captureException(new Error("D1 query failed"), {
      tags: { function: "getEventAttendees" },
    });
    throw new Error("D1 query failed");
  }

  return (result.result?.[0]?.results as unknown as Attendee[]) ?? [];
}

export async function addAttendee(
  eventId: string,
  fullName: string,
  email: string | null,
  phone: string | null,
  paymentIntentId: string | null,
): Promise<number> {
  const result = await queryD1(
    `INSERT INTO event_attendees (event_id, full_name, email, phone, payment_intent_id)
     VALUES (?, ?, ?, ?, ?)`,
    [eventId, fullName, email, phone, paymentIntentId],
  );

  if (!result.success) {
    Sentry.captureException(new Error("D1 insert failed"), {
      tags: { function: "addAttendee" },
    });
    throw new Error("D1 insert failed");
  }

  return 1;
}

export async function getAttendeeByPaymentIntent(
  paymentIntentId: string,
): Promise<Attendee | null> {
  const result = await queryD1(
    "SELECT * FROM event_attendees WHERE payment_intent_id = ? LIMIT 1",
    [paymentIntentId],
  );

  if (!result.success) {
    Sentry.captureException(new Error("D1 query failed"), {
      tags: { function: "getAttendeeByPaymentIntent" },
    });
    throw new Error("D1 query failed");
  }

  const rows = result.result?.[0]?.results as unknown as Attendee[] | undefined;
  return rows?.[0] ?? null;
}

export { MAX_SEATS };

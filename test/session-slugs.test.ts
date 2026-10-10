// Unit tests for the Cal.com session slug resolution: exact slug match,
// unknown keys, missing slugs, and newest-wins on duplicate slugs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CalComEventType } from "../src/types/calcom.js";
import {
  SESSION_SLUGS,
  resolveEventTypeForSession,
} from "../src/config/session-slugs.js";

function makeEvent(id: number, slug: string): CalComEventType {
  return {
    id,
    title: `Event ${id}`,
    slug,
    description: null,
    lengthInMinutes: 60,
    locations: [],
    bookingFields: [],
    disableGuests: false,
    slotInterval: null,
    minimumBookingNotice: 0,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    scheduleId: null,
    price: 0,
    currency: "RON",
    bookingLimitsCount: null,
    confirmationPolicy: null,
    recurringEvent: null,
    seatsPerTimeSlot: null,
  };
}

describe("SESSION_SLUGS", () => {
  it("maps every session key to a non-empty slug", () => {
    assert.ok(Object.keys(SESSION_SLUGS).length > 0);
    for (const slug of Object.values(SESSION_SLUGS)) {
      assert.ok(slug.length > 0);
    }
  });
});

describe("resolveEventTypeForSession", () => {
  const events = [
    makeEvent(1, "astrograma-natala-si-karmica"),
    makeEvent(2, "astrograma-relationala"),
  ];

  it("resolves an exact slug match", () => {
    const found = resolveEventTypeForSession(
      "astrograma-relationala",
      events,
    );
    assert.equal(found?.id, 2);
  });

  it("returns undefined for an unknown session key", () => {
    assert.equal(resolveEventTypeForSession("no-such-session", events), undefined);
  });

  it("returns undefined when no event carries the expected slug", () => {
    assert.equal(
      resolveEventTypeForSession("astrograma-previzionala", events),
      undefined,
    );
  });

  it("returns undefined for an empty event list", () => {
    assert.equal(
      resolveEventTypeForSession("astrograma-natala-si-karmica", []),
      undefined,
    );
  });

  it("prefers the most recently created event on duplicate slugs", () => {
    const duplicates = [
      makeEvent(10, "astrograma-natala-si-karmica"),
      makeEvent(42, "astrograma-natala-si-karmica"),
    ];
    const found = resolveEventTypeForSession(
      "astrograma-natala-si-karmica",
      duplicates,
    );
    assert.equal(found?.id, 42);
  });
});

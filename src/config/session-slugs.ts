import type { CalComEventType } from "../types/calcom.js";

/**
 * Keys used by the frontend in URLs / session; mapping to the Cal.com event type slug.
 * If you created the event with `npm run seed`, natal-karmic may be `astrograma-natala-si-karmica` in Cal.com —
 * aliases also tries the seeded variant.
 */
export const SESSION_SLUGS: Record<string, string> = {
  "astrograma-natala-si-karmica": "astrograma-natala-si-karmica",
  "astrograma-relationala": "astrograma-relationala",
  "astrograma-previzionala": "astrograma-previzionala",
};

/** Alternative slugs (legacy / rename) for the same session key. */
export const SESSION_SLUG_ALIASES: Record<string, string[]> = {
  // 'astrograma-natala-si-karmica': ['astrograma-natala-si-karmica'],
};

export function resolveEventTypeForSession(
  sessionKey: string,
  eventTypes: CalComEventType[],
): CalComEventType | undefined {
  const expectedSlug = SESSION_SLUGS[sessionKey];
  if (!expectedSlug) return undefined;

  // First try exact slug match
  let candidates = eventTypes.filter((e) => e.slug === expectedSlug);

  // If no exact match, try aliases
  if (candidates.length === 0) {
    const aliases = SESSION_SLUG_ALIASES[sessionKey];
    if (aliases) {
      for (const slug of aliases) {
        const aliasCandidates = eventTypes.filter((e) => e.slug === slug);
        if (aliasCandidates.length > 0) {
          candidates = aliasCandidates;
          break;
        }
      }
    }
  }

  if (candidates.length === 0) return undefined;

  // Return the most recently created event type (highest ID)
  return candidates.sort((a, b) => b.id - a.id)[0];
}

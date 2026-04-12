import type { CalComEventType } from '../types/calcom.js';

/**
 * Chei folosite de frontend în URL-uri / session; mapare la slug-ul event type-ului din Cal.com.
 * Dacă ai creat evenimentul cu `npm run seed`, natal-karmic poate fi `astrograma-natala-si-karmica` în Cal.com —
 * aliases încearcă și varianta din seed.
 */
export const SESSION_SLUGS: Record<string, string> = {
  'astrograma-natala-si-karmica': 'astrograma-natala-si-karmica',
  'astrograma-relationala': 'astrograma-relationala',
  'astrograma-previzionala': 'astrograma-previzionala',
};

/** Slug-uri alternative (legacy / rename) pentru aceeași cheie de sesiune. */
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

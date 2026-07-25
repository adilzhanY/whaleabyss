import type { AddonService } from '@/store/useAddonPrompt';

export const PROFILE_TIMEOUT_MS = 4000;
export const ADDONS_TIMEOUT_MS = 4000;
/** Delays *between* attempts; length + 1 = total attempts. */
export const ADDONS_BACKOFF_MS = [300, 800];

/**
 * fetch with a hard deadline. The add-to-cart chain had none, so a request that
 * hung (captive portal, dead cell) left the button dead with no feedback and no
 * bound on how long the user waited.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the quest list for a service.
 *
 * Returns `null` for "couldn't find out" and an array for a definitive answer —
 * the distinction the old code could not make, because the route answered both
 * "this service has no quests" and "the lookup failed" with `200 {addons: []}`.
 * A single blip therefore looked like a definitive "no quests", skipped the
 * mandatory modal, and produced an undeclared line.
 *
 * 404 means the service resolved to nothing, which IS definitive (nothing to
 * declare). Any other non-2xx, a network error, or a timeout is retried and
 * then reported as null so the caller can refuse the add instead of degrading.
 */
export async function fetchQuestAddons(
  slug: string
): Promise<AddonService[] | null> {
  for (let attempt = 0; attempt <= ADDONS_BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `/api/services/${encodeURIComponent(slug)}/addons`,
        ADDONS_TIMEOUT_MS
      );
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.addons) ? data.addons : [];
      }
      if (res.status === 404) return [];
    } catch {
      // network error / timeout — retry below
    }
    const backoff = ADDONS_BACKOFF_MS[attempt];
    if (backoff) await new Promise((r) => setTimeout(r, backoff));
  }
  return null;
}

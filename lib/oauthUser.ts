import { db } from '@/lib/db';
import { users, oauthAccounts } from '@/lib/schema';
import { and, eq, ilike } from 'drizzle-orm';

/** Fields we read from the Yandex ID userinfo (login.yandex.ru/info). */
export interface YandexProfile {
  id: string;
  login?: string;
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
  default_email?: string;
  emails?: string[];
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
}

export function yandexAvatarUrl(profile: YandexProfile): string | null {
  if (!profile.default_avatar_id || profile.is_avatar_empty) return null;
  return `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`;
}

// Site usernames are ASCII-only (registration sanitizes with stripNonLatin), but
// most Yandex profiles carry Cyrillic names — transliterate instead of dropping
// them, so «Адильжан» becomes "Adilzhan" rather than falling through to an
// email local-part or a generated fallback.
const RU_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function transliterate(value: string): string {
  let out = '';
  for (const ch of value) {
    const lower = ch.toLowerCase();
    const mapped = RU_TO_LAT[lower];
    if (mapped === undefined) { out += ch; continue; }
    out += ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
  }
  return out;
}

/** Yandex accounts registered via an external email / social login get a
 *  technical `uid-xxxxxxxx` login — never use it as a display username. */
const isTechnicalLogin = (login: string) => /^uid-/i.test(login);

function toUsernameCandidate(raw: string | undefined | null): string {
  return transliterate(raw ?? '')
    .replace(/[^\x20-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** Derive a unique username from the Yandex profile, preferring the person's
 *  actual name over machine identifiers. */
async function pickUsername(profile: YandexProfile, email: string): Promise<string> {
  const candidates = [
    profile.first_name,
    profile.real_name,
    profile.display_name,
    profile.login && !isTechnicalLogin(profile.login) ? profile.login : null,
    email.split('@')[0],
  ];
  let base = '';
  for (const c of candidates) {
    const ascii = toUsernameCandidate(c);
    if (ascii.length >= 3) { base = ascii; break; }
  }
  if (!base) base = 'user';

  // Try the base name as-is, then with short numeric suffixes until free.
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = attempt === 0 ? '' : `_${Math.floor(Math.random() * 10_000)}`;
    const candidate = `${base}${suffix}`.slice(0, 50);
    const taken = await db.select({ id: users.id }).from(users)
      .where(ilike(users.username, candidate)).limit(1);
    if (!taken[0]) return candidate;
  }
  // Practically unreachable; last resort is provider-id based and unique.
  return `user_${profile.id}`.slice(0, 50);
}

/** Heal rows provisioned before the username/avatar logic was fixed (or when
 *  Yandex data appeared later): fill a missing avatar, and replace a technical
 *  `uid-…` username with one derived from the profile name. Never touches a
 *  username the user picked themselves (those don't match the uid- pattern). */
async function backfillFromProfile(
  user: typeof users.$inferSelect,
  profile: YandexProfile,
  email: string,
): Promise<typeof users.$inferSelect> {
  const patch: Partial<typeof users.$inferInsert> = {};

  const avatar = yandexAvatarUrl(profile);
  if (!user.avatarUrl && avatar) patch.avatarUrl = avatar;

  if (isTechnicalLogin(user.username)) {
    const better = await pickUsername(profile, email);
    if (!isTechnicalLogin(better)) patch.username = better;
  }

  if (Object.keys(patch).length === 0) return user;
  patch.updatedAt = new Date();
  const updated = await db.update(users).set(patch)
    .where(eq(users.id, user.id)).returning();
  return updated[0] ?? user;
}

/**
 * Resolve a Yandex login to a local user row, creating or linking as needed:
 * 1. oauth_accounts already has (yandex, profile.id) → that user (backfilled).
 * 2. A user with the same (verified by Yandex) email exists → link and reuse.
 * 3. Otherwise create a fresh user with no password.
 * Returns null when Yandex supplied no email — we can't provision without one.
 */
export async function getOrCreateUserFromYandex(profile: YandexProfile) {
  const email = (profile.default_email ?? profile.emails?.[0] ?? '').toLowerCase().trim();
  if (!email) return null;

  const linked = await db
    .select({ user: users })
    .from(oauthAccounts)
    .innerJoin(users, eq(users.id, oauthAccounts.userId))
    .where(and(
      eq(oauthAccounts.provider, 'yandex'),
      eq(oauthAccounts.providerAccountId, profile.id),
    ))
    .limit(1);
  if (linked[0]) return backfillFromProfile(linked[0].user, profile, email);

  const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let user = byEmail[0];

  if (!user) {
    const username = await pickUsername(profile, email);
    const inserted = await db.insert(users).values({
      username,
      email,
      passwordHash: null,
      avatarUrl: yandexAvatarUrl(profile),
    }).returning();
    user = inserted[0];
  }

  // Link the identity. onConflictDoNothing guards the race where two callbacks
  // for the same fresh Yandex account run concurrently.
  await db.insert(oauthAccounts).values({
    userId: user.id,
    provider: 'yandex',
    providerAccountId: profile.id,
  }).onConflictDoNothing();

  return backfillFromProfile(user, profile, email);
}

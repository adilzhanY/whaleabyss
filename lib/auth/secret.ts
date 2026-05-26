/**
 * Resolves the NextAuth signing secret used to sign/verify session tokens.
 *
 * In production a missing `NEXTAUTH_SECRET` is a hard error — we refuse to fall
 * back to a constant. A hardcoded fallback in a public repo would be known to
 * everyone, letting anyone forge a valid (admin) session. In development we
 * allow a clearly-labelled placeholder so a fresh clone runs on localhost.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to start with an insecure fallback — " +
        "set NEXTAUTH_SECRET in the environment."
    );
  }

  return "dev-only-insecure-secret-not-used-in-production";
}

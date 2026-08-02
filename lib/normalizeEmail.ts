/**
 * The single normalisation for an email used as an IDENTITY key — the `email`
 * column of `users`, `otps` and `password_reset_tokens`.
 *
 * `users.email` is a plain case-sensitive `varchar` with a UNIQUE constraint,
 * so "the same address" is only the same row if every entry point spells it
 * identically. It did not: `authorize()` lowercased before its lookup while
 * `register` inserted the raw string, so an account created as `User@x.ru`
 * could never be logged into — the lookup went to `user@x.ru` and found
 * nothing. Route every identity email through here instead of hand-rolling
 * `.toLowerCase()` at the call site, so a new entry point can't miss it.
 *
 * NOT for `users.receiptEmail`: that is a delivery address, not an identity,
 * and is never used to find a row.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

# Website Hardening TODO

_Created: 2026-05-26_

Operational/security hardening backlog (not new features). Ranked by impact.

## 🔴 Security

- [x] **1. Upgrade Next.js (outdated, multiple high-severity CVEs).** _(done 2026-05-26)_
  Bumped Next.js 16.1.6 → 16.2.6 + `eslint-config-next`; fixed
  `fast-xml-parser` / `fast-xml-builder` via targeted `npm audit fix`.
  Result: all high-severity Next CVEs cleared (incl. middleware/proxy bypass);
  prod audit now 5 moderate / 0 high. Typecheck + build verified green.
  Remaining moderates have no clean fix (next/postcss patched only in an
  unreleased canary; next-auth/uuid would need breaking downgrades).
  Note: `nodemailer` 7.0.13 still has a real moderate SMTP-injection advisory
  fixable via a major bump — deferred (needs `lib/email.ts` retest).

- [ ] **2. Add rate limiting / brute-force protection on auth routes.**
  `send-otp`, `forgot-password`, and `[...nextauth]` currently have none.
  Risks: OTP/email bombing (abuses SMTP quota + cost), login brute-forcing.
  Add per-IP + per-email throttling (in-memory or Postgres-backed, no new infra).

- [ ] **3. Add security headers in `next.config.ts`.**
  No `headers()` config and `poweredByHeader` still on (leaks Next.js).
  Add HSTS, `X-Content-Type-Options`, `X-Frame-Options` / `frame-ancestors`
  (clickjacking), `Referrer-Policy`, and a CSP. Disable `poweredByHeader`.

## 🟠 Stability & reliability

- [ ] **4. Add a CI safety gate before deploy.**
  `deploy.yml` runs `git pull && npm install && npm run build && pm2 restart`
  directly on the prod VM — no lint/typecheck/test gate, not atomic, no
  rollback. Run lint + typecheck + build in CI first; only deploy on pass.
  Consider building an artifact + atomic swap with rollback.

- [ ] **5. Set up automated database backups.**
  No backups detected for orders/users/payment data. Add scheduled `pg_dump`
  (or managed-DB automated snapshots + point-in-time recovery).

- [ ] **6. Set up a staging environment.**
  Pushing to `main` ships straight to live customers with no smoke-test step.
  Add a cheap staging deploy (or preview env) to catch breakage before prod.

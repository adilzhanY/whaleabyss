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

- [x] **2. Add rate limiting / brute-force protection on auth routes.** _(done 2026-05-26)_
  New `lib/rateLimit.ts` (in-memory sliding window, single-instance pm2 fork).
  Applied per-IP + per-email: `send-otp` (5/email, 20/IP per 15min, after captcha),
  `forgot-password` (3/email, 15/IP), and login `authorize` (8/account, 30/IP,
  counts failures only + clears on success). Login form shows a distinct
  "too many attempts" message. Typecheck + build green.
  Note: assumes pm2 fork mode (single process); move to a shared store if scaled
  to cluster/multi-VM.

- [x] **3. Add security headers in `next.config.ts`.** _(done 2026-05-26)_
  Disabled `poweredByHeader`; enforced HSTS (max-age 2y, no includeSubDomains
  yet), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo off). CSP shipped in
  **Report-Only** mode (allows Metrika, SmartCaptcha, S3; excludes the CDN-based
  `/banner.html`) so live flows can be validated before enforcing. Verified all
  headers emit correctly via a local prod server. **Follow-ups:** (a) flip CSP
  Report-Only → enforce after confirming the console is clean on registration
  captcha / checkout / avatar / Metrika; (b) consider nonce-based `script-src`
  to drop `'unsafe-inline'`; (c) add HSTS `includeSubDomains`+preload once all
  subdomains are HTTPS.

## 🟠 Stability & reliability

- [x] **4. Add a CI safety gate before deploy.** _(done 2026-05-26)_
  Split `deploy.yml` into `verify` + `deploy` jobs; deploy `needs: verify`.
  `verify` runs `npx tsc --noEmit` (hard gate — clean, no DB/secrets needed;
  confirmed it passes on a cold checkout despite the `.next/types` import) and
  `npm run lint` (non-blocking via `continue-on-error`, given the 85 pre-existing
  errors). Full `next build` deliberately stays on the VM — it does build-time DB
  queries a CI runner can't reach. **Follow-ups (not done):** atomic deploy +
  rollback (currently `git pull && build && pm2 restart` in place on the VM, so a
  failed build can still leave prod half-broken); clean up the 85 lint errors so
  lint can become a hard gate.

- [ ] **5. Set up automated database backups.**
  No backups detected for orders/users/payment data. Add scheduled `pg_dump`
  (or managed-DB automated snapshots + point-in-time recovery).

- [ ] **6. Set up a staging environment.**
  Pushing to `main` ships straight to live customers with no smoke-test step.
  Add a cheap staging deploy (or preview env) to catch breakage before prod.

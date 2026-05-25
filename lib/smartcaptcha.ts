/**
 * Server-side verification for Yandex SmartCaptcha.
 *
 * Validates the one-time token issued by the client widget against Yandex's
 * validate endpoint using the secret server key. Returns true only when Yandex
 * confirms a human (status === 'ok').
 *
 * If no server key is configured (e.g. local dev without captcha), verification
 * is skipped and returns true so the flow isn't blocked. In production both keys
 * are set, so the gate is enforced.
 */
const VALIDATE_URL = 'https://smartcaptcha.cloud.yandex.ru/validate';

export async function verifySmartCaptcha(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.YANDEX_SMARTCAPTCHA_SERVER_KEY;

  if (!secret) {
    console.warn('[SmartCaptcha] YANDEX_SMARTCAPTCHA_SERVER_KEY not set — skipping verification.');
    return true;
  }

  if (!token) return false;

  const params = new URLSearchParams({ secret, token });
  if (ip) params.set('ip', ip);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('[SmartCaptcha] Validate endpoint returned HTTP', res.status);
      return false;
    }

    const data = (await res.json()) as { status?: string };
    return data.status === 'ok';
  } catch (err) {
    // Network error / timeout. Fail closed — the user explicitly wants the
    // captcha to gate OTP sending. (Flip to `return true` here to instead let
    // users through when Yandex is unreachable.)
    console.error('[SmartCaptcha] Verification request failed:', err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

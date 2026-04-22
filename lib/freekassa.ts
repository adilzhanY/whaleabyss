import crypto from 'crypto';

/**
 * Freekassa integration (API 2.0).
 *
 * Required env:
 *   FREEKASSA_SHOP_ID      — integer merchant/shop id (ID магазина).
 *   FREEKASSA_API_KEY      — secret API key used to sign API 2.0 requests (HMAC-SHA256).
 *   FREEKASSA_SECRET_1     — "Секретное слово" (used if we ever need classic form signatures).
 *   FREEKASSA_SECRET_2     — "Секретное слово 2" — used to verify payment notifications (MD5).
 *
 * Docs: https://docs.freekassa.com (Orders / Create order & Notification URL).
 */

// Freekassa's currently-reachable API edge is `api.fk.life` (Cloudflare).
// The older `api.freekassa.com` / `api.freekassa.ru` hosts are documented but
// may time out from some networks. Override via FREEKASSA_API_BASE if needed.
const FK_API_BASE = process.env.FREEKASSA_API_BASE || 'https://api.fk.life/v1';

function getEnv(): {
  shopId: number;
  apiKey: string;
  secret1: string;
  secret2: string;
} {
  const shopIdRaw = process.env.FREEKASSA_SHOP_ID;
  const apiKey = process.env.FREEKASSA_API_KEY;
  const secret1 = process.env.FREEKASSA_SECRET_1;
  const secret2 = process.env.FREEKASSA_SECRET_2;

  if (!shopIdRaw || !apiKey || !secret1 || !secret2) {
    throw new Error(
      'Freekassa env is incomplete. Required: FREEKASSA_SHOP_ID, FREEKASSA_API_KEY, FREEKASSA_SECRET_1, FREEKASSA_SECRET_2.'
    );
  }

  const shopId = Number(shopIdRaw);
  if (!Number.isFinite(shopId) || shopId <= 0) {
    throw new Error('FREEKASSA_SHOP_ID must be a positive integer.');
  }

  return { shopId, apiKey, secret1, secret2 };
}

/**
 * API 2.0 signature:
 *   1. Collect all request body fields except `signature` itself.
 *   2. Sort keys alphabetically.
 *   3. Join the string values with "|" (empty values are kept as empty strings).
 *   4. HMAC-SHA256 the resulting string using the api key as the secret, lowercase hex.
 */
function signApiRequest(body: Record<string, unknown>, apiKey: string): string {
  const keys = Object.keys(body).sort();
  const payload = keys.map((k) => String(body[k] ?? '')).join('|');
  return crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
}

export interface CreateOrderOptions {
  /** Our internal order UUID — Freekassa calls it paymentId (arbitrary string up to 50 chars). */
  orderId: string;
  /** Amount in rubles, two decimals. */
  amount: number;
  /** User email, required by FK for receipts. */
  email: string;
  /** Client IP as seen by the server (FK requires it). */
  ip: string;
  /** ISO currency code, default "RUB". */
  currency?: 'RUB' | 'USD' | 'EUR' | 'UAH' | 'KZT';
  /** Optional specific payment method id (see FK docs / dashboard). If omitted, FK shows the chooser. */
  paymentMethodId?: number;
  /** URLs to override the ones set in the FK dashboard. */
  successUrl?: string;
  failureUrl?: string;
  notificationUrl?: string;
}

export interface CreateOrderResult {
  /** URL to which the customer should be redirected to complete the payment. */
  location: string;
  /** Freekassa's internal order id. */
  fkOrderId: number;
  /** Freekassa's order hash (used by their widgets; we don't need it). */
  orderHash?: string;
}

/**
 * Creates a payment order on Freekassa via API 2.0 and returns the hosted payment URL.
 * The customer should be redirected to `location` to pay.
 */
export async function createFreekassaOrder(
  opts: CreateOrderOptions
): Promise<CreateOrderResult> {
  const { shopId, apiKey } = getEnv();

  const body: Record<string, string | number> = {
    shopId,
    nonce: Date.now(), // must be strictly increasing per shop
    paymentId: opts.orderId,
    amount: Number(opts.amount.toFixed(2)),
    currency: opts.currency ?? 'RUB',
    email: opts.email,
    ip: opts.ip,
  };

  // `i` (payment system id) is REQUIRED by FK API 2.0.
  // Defaults to Card RUB API (36). Override per-call or via FREEKASSA_DEFAULT_METHOD.
  // Common ids: 4=VISA RUB, 8=MasterCard RUB, 12=МИР, 36=Card RUB API, 42=СБП, 44=СБП API.
  const defaultMethod = Number(process.env.FREEKASSA_DEFAULT_METHOD) || 36;
  body.i = opts.paymentMethodId ?? defaultMethod;

  // URL override fields require FK support to enable on the shop. To keep
  // requests valid by default, only send them when FREEKASSA_OVERRIDE_URLS=true.
  if (process.env.FREEKASSA_OVERRIDE_URLS === 'true') {
    if (opts.successUrl) body.success_url = opts.successUrl;
    if (opts.failureUrl) body.failure_url = opts.failureUrl;
    if (opts.notificationUrl) body.notification_url = opts.notificationUrl;
  }

  const signature = signApiRequest(body, apiKey);
  const requestBody = { ...body, signature };

  const res = await fetch(`${FK_API_BASE}/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    // Never cache payment requests.
    cache: 'no-store',
  });

  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`[Freekassa] Non-JSON response (${res.status}): ${raw.slice(0, 500)}`);
  }

  if (!res.ok || json.type !== 'success' || !json.location) {
    const message = json?.message || json?.error || raw.slice(0, 500);
    throw new Error(`[Freekassa] Order creation failed (${res.status}): ${message}`);
  }

  return {
    location: json.location,
    fkOrderId: json.orderId ?? json.data?.orderId,
    orderHash: json.orderHash ?? json.data?.orderHash,
  };
}

/**
 * Verifies the signature of an incoming payment notification.
 *
 * Freekassa's notification body (classic SCI format, also used with API 2.0) contains:
 *   MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN, P_EMAIL, intid, ...
 * Signature format: md5("{shop_id}:{amount}:{secret2}:{merchant_order_id}")
 */
export function verifyFreekassaNotification(params: {
  merchantId: string;
  amount: string;
  merchantOrderId: string;
  sign: string;
}): boolean {
  const { shopId, secret2 } = getEnv();

  if (String(shopId) !== String(params.merchantId)) return false;

  const expected = crypto
    .createHash('md5')
    .update(`${params.merchantId}:${params.amount}:${secret2}:${params.merchantOrderId}`)
    .digest('hex');

  // FK historically returns the hash lowercase; compare case-insensitively to be safe.
  return expected.toLowerCase() === params.sign.toLowerCase();
}

/**
 * Official Freekassa notification-source IP addresses. Enable by setting
 * FREEKASSA_CHECK_IP=true in the environment. List is maintained by FK —
 * keep it in sync with their docs if it ever changes.
 */
export const FREEKASSA_NOTIFY_IPS = new Set<string>([
  '168.119.157.136',
  '168.119.60.227',
  '178.154.197.79',
  '51.250.54.238',
]);

export function shouldCheckNotifyIp(): boolean {
  return process.env.FREEKASSA_CHECK_IP === 'true';
}

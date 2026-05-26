import crypto from 'crypto';

/**
 * Freekassa integration.
 *
 * Two integration modes are provided:
 *
 *   1) SCI form redirect (default, used by the checkout).
 *      Redirects the user to https://pay.fk.money/ which shows a full
 *      payment-method chooser (СБП).
 *      No server-to-server call, no API 2.0 wallet-login wall.
 *
 *   2) API 2.0 JSON (`createFreekassaOrder`).
 *      Server creates an order via https://api.fk.life/v1/orders/create and
 *      receives a payment URL. Useful for headless flows, but the URL FK
 *      returns is the FKWallet invoice page, which forces the buyer into
 *      the FKwallet login/registration flow — not what a regular web shop
 *      wants. Kept here as a utility; NOT used by the checkout.
 *
 * Notifications (webhook) are identical for both modes:
 *   SIGN = md5("{shop_id}:{amount}:{SECRET_2}:{merchant_order_id}")
 *   Expected response body: plain text "YES".
 *
 * Required env:
 *   FREEKASSA_SHOP_ID      — integer merchant/shop id (ID магазина).
 *   FREEKASSA_SECRET_1     — "Секретное слово"   — signs the SCI redirect.
 *   FREEKASSA_SECRET_2     — "Секретное слово 2" — verifies notifications.
 *   FREEKASSA_API_KEY      — API 2.0 key (used only by `createFreekassaOrder`).
 *
 * Docs: https://docs.freekassa.com
 */

// -------- Environment --------------------------------------------------------

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

// -------- Payment method IDs (recommended by FK for this shop) ---------------

/**
 * Payment method IDs explicitly recommended by Freekassa for this shop
 * (see merchant dashboard banner: ID 36 / 35 / 44).
 *
 * Passing one of these as `i=` on the SCI URL skips the method chooser and
 * sends the buyer straight into the selected acquiring channel. Per FK's
 * brand requirements, when a specific method is selected we MUST present
 * it under its own name (СБП) — never under the Freekassa
 * brand or logo.
 */
export const FREEKASSA_METHODS = {
  /** СБП — Система быстрых платежей */
  SBP: 44,
  /** Банковские карты РФ (Card RUB API). Currently only offered in the admin
   *  testing flow; the public checkout still uses SBP only. */
  CARD_RUB: 36,
} as const;

export type FreekassaMethodId =
  (typeof FREEKASSA_METHODS)[keyof typeof FREEKASSA_METHODS];

/** Set of method IDs we accept from clients on the checkout endpoint. */
export const ALLOWED_METHOD_IDS: ReadonlySet<number> = new Set(
  Object.values(FREEKASSA_METHODS)
);

// -------- SCI form redirect (primary flow) -----------------------------------

const FK_SCI_ENDPOINT = process.env.FREEKASSA_SCI_URL || 'https://pay.fk.money/';

export interface BuildPaymentUrlOptions {
  /** Our internal order id (UUID or similar, FK accepts any string up to ~50 chars). */
  orderId: string;
  /** Amount in the chosen currency, will be formatted to 2 decimals. */
  amount: number;
  /** Customer email (optional — pre-fills the form). */
  email?: string;
  /** Customer phone (optional — pre-fills the form). */
  phone?: string;
  /** ISO currency code. Default "RUB". */
  currency?: 'RUB' | 'USD' | 'EUR' | 'UAH' | 'KZT';
  /** Interface language. Default "ru". */
  lang?: 'ru' | 'en';
  /** Pre-select a payment method (see FK currencies table). Leave unset to show chooser. */
  paymentMethodId?: number;
  /** Custom params. Keys MUST start with "us_" and contain only [a-zA-Z0-9]. */
  custom?: Record<string, string | number>;
}

/**
 * Builds the SCI redirect URL. The customer should be redirected here; FK
 * handles the whole payment UX and sends a notification to the URL
 * configured in the shop's dashboard once paid.
 *
 * Signature: md5("{shop_id}:{amount}:{SECRET_1}:{currency}:{order_id}")
 *   — this order of arguments is fixed by FK's SCI spec (§1.5).
 */
export function buildFreekassaPaymentUrl(opts: BuildPaymentUrlOptions): string {
  const { shopId, secret1 } = getEnv();

  const amount = Number(opts.amount.toFixed(2));
  const currency = opts.currency ?? 'RUB';

  const signature = crypto
    .createHash('md5')
    .update(`${shopId}:${amount}:${secret1}:${currency}:${opts.orderId}`)
    .digest('hex');

  const params = new URLSearchParams();
  params.set('m', String(shopId));
  params.set('oa', String(amount));
  params.set('currency', currency);
  params.set('o', opts.orderId);
  params.set('s', signature);
  params.set('lang', opts.lang ?? 'ru');

  if (opts.paymentMethodId !== undefined) {
    params.set('i', String(opts.paymentMethodId));
  }
  if (opts.email) params.set('em', opts.email);
  if (opts.phone) params.set('phone', opts.phone);

  if (opts.custom) {
    for (const [key, value] of Object.entries(opts.custom)) {
      if (!/^us_[a-zA-Z0-9]+$/.test(key)) {
        throw new Error(
          `Freekassa custom param "${key}" must match ^us_[a-zA-Z0-9]+$`
        );
      }
      params.set(key, String(value));
    }
  }

  return `${FK_SCI_ENDPOINT}?${params.toString()}`;
}

// -------- API 2.0 (kept for completeness; NOT used by checkout) --------------

const FK_API_BASE = process.env.FREEKASSA_API_BASE || 'https://api.fk.life/v1';

/**
 * API 2.0 signature:
 *   1. Take all request body fields except `signature` itself.
 *   2. Sort keys alphabetically.
 *   3. Join the string values with "|".
 *   4. HMAC-SHA256 with the API key as the secret, lowercase hex.
 */
function signApiRequest(body: Record<string, unknown>, apiKey: string): string {
  const keys = Object.keys(body).sort();
  const payload = keys.map((k) => String(body[k] ?? '')).join('|');
  return crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
}

export interface CreateOrderOptions {
  orderId: string;
  amount: number;
  email: string;
  ip: string;
  currency?: 'RUB' | 'USD' | 'EUR' | 'UAH' | 'KZT';
  paymentMethodId?: number;
}

export interface CreateOrderResult {
  location: string;
  fkOrderId: number;
  orderHash?: string;
}

/**
 * Creates a payment order via API 2.0 (server-to-server). Returns FK's
 * hosted payment URL.
 *
 * NOTE: as of 2026, the URL returned by API 2.0 redirects the buyer into
 * the FKWallet invoice page, which requires wallet registration/login.
 * Prefer `buildFreekassaPaymentUrl` (SCI) for end-user checkouts.
 */
export async function createFreekassaOrder(
  opts: CreateOrderOptions
): Promise<CreateOrderResult> {
  const { shopId, apiKey } = getEnv();

  const body: Record<string, string | number> = {
    shopId,
    nonce: Date.now(),
    paymentId: opts.orderId,
    amount: Number(opts.amount.toFixed(2)),
    currency: opts.currency ?? 'RUB',
    email: opts.email,
    ip: opts.ip,
    i: opts.paymentMethodId ?? 44,
  };

  const signature = signApiRequest(body, apiKey);
  const requestBody = { ...body, signature };

  const res = await fetch(`${FK_API_BASE}/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `[Freekassa] Non-JSON response (${res.status}): ${raw.slice(0, 500)}`
    );
  }

  if (!res.ok || json.type !== 'success' || !json.location) {
    const message = json?.message || json?.error || raw.slice(0, 500);
    throw new Error(
      `[Freekassa] Order creation failed (${res.status}): ${message}`
    );
  }

  return {
    location: json.location,
    fkOrderId: json.orderId ?? json.data?.orderId,
    orderHash: json.orderHash ?? json.data?.orderHash,
  };
}

// -------- Refund (API 2.0) ---------------------------------------------------

export interface RefundOrderOptions {
  /** Our internal order id (UUID) OR Freekassa's internal order id */
  orderId?: string;
  /** Freekassa's internal order id (stored as paymentId in our DB) OR our order id */
  paymentId?: string;
}

export interface RefundOrderResult {
  refundId: number;
}

/**
 * Refunds a paid order via Freekassa API 2.0.
 * You must provide either `orderId` (FK's internal ID) OR `paymentId` (your order ID).
 *
 * According to Freekassa docs, the refund endpoint uses query parameters,
 * but we'll try both GET with query params and POST with JSON body.
 */
export async function refundFreekassaOrder(
  opts: RefundOrderOptions
): Promise<RefundOrderResult> {
  const { shopId, apiKey } = getEnv();

  if (!opts.orderId && !opts.paymentId) {
    throw new Error('[Freekassa] Refund requires either orderId or paymentId');
  }

  // Build params object
  const body: Record<string, string | number> = {
    shopId: Number(shopId),
    nonce: Date.now(),
  };

  // orderId should be Freekassa's internal numeric ID
  if (opts.orderId) {
    const orderIdNum = Number(opts.orderId);
    if (!Number.isFinite(orderIdNum)) {
      throw new Error(`[Freekassa] orderId must be a valid number, got: ${opts.orderId}`);
    }
    body.orderId = orderIdNum;
  }

  // paymentId is our UUID string
  if (opts.paymentId) {
    body.paymentId = String(opts.paymentId);
  }

  // Generate signature using the same method as createOrder
  const signature = signApiRequest(body, apiKey);
  const requestBody = { ...body, signature };

  console.log('[Freekassa] Refund request body:', requestBody);

  const res = await fetch(`${FK_API_BASE}/orders/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `[Freekassa] Refund non-JSON response (${res.status}): ${raw.slice(0, 500)}`
    );
  }

  console.log('[Freekassa] Refund response:', json);

  if (!res.ok || json.type !== 'success' || !json.id) {
    const message = json?.message || json?.error || JSON.stringify(json);
    throw new Error(
      `[Freekassa] Refund failed (${res.status}): ${message}`
    );
  }

  return {
    refundId: json.id,
  };
}

// -------- Notification verification (same for both modes) --------------------

/**
 * Verifies Freekassa's notification signature.
 * Signature format: md5("{shop_id}:{amount}:{SECRET_2}:{merchant_order_id}")
 */
export function verifyFreekassaNotification(params: {
  merchantId: string;
  amount: string;
  merchantOrderId: string;
  sign: string;
}): boolean {
  const { shopId, secret2 } = getEnv();

  if (String(shopId) !== String(params.merchantId)) return false;

  const signatureString = `${params.merchantId}:${params.amount}:${secret2}:${params.merchantOrderId}`;
  console.log('[Freekassa] Signature string:', signatureString);
  console.log('[Freekassa] SECRET_2 length:', secret2.length);
  console.log('[Freekassa] SECRET_2 first 4 chars:', secret2.substring(0, 4));

  const expected = crypto
    .createHash('md5')
    .update(signatureString)
    .digest('hex');

  console.log('[Freekassa] Expected signature:', expected);
  console.log('[Freekassa] Received signature:', params.sign);
  console.log('[Freekassa] Match:', expected.toLowerCase() === params.sign.toLowerCase());

  return expected.toLowerCase() === params.sign.toLowerCase();
}

/**
 * Official Freekassa notification-source IP addresses.
 * Enable the IP filter with FREEKASSA_CHECK_IP=true.
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

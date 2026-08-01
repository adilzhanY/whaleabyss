// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  verifyFreekassaNotification,
  buildFreekassaPaymentUrl,
  createFreekassaOrder,
  shouldCheckNotifyIp,
} from "@/lib/freekassa";

const SHOP = "12345";
const S1 = "secret_one";
const S2 = "secret_two";
const API = "api_key_xyz";

function stubFkEnv() {
  vi.stubEnv("FREEKASSA_SHOP_ID", SHOP);
  vi.stubEnv("FREEKASSA_SECRET_1", S1);
  vi.stubEnv("FREEKASSA_SECRET_2", S2);
  vi.stubEnv("FREEKASSA_API_KEY", API);
}

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

beforeEach(stubFkEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyFreekassaNotification — the only real auth on the money endpoint", () => {
  const order = "order-abc";
  const amount = "1500.00";
  const goodSign = () => md5(`${SHOP}:${amount}:${S2}:${order}`);

  it("accepts a correctly computed md5", () => {
    expect(
      verifyFreekassaNotification({ merchantId: SHOP, amount, merchantOrderId: order, sign: goodSign() })
    ).toBe(true);
  });

  it("accepts an uppercase-hex signature (case-insensitive compare)", () => {
    expect(
      verifyFreekassaNotification({
        merchantId: SHOP,
        amount,
        merchantOrderId: order,
        sign: goodSign().toUpperCase(),
      })
    ).toBe(true);
  });

  it("rejects a wrong merchantId", () => {
    expect(
      verifyFreekassaNotification({ merchantId: "99999", amount, merchantOrderId: order, sign: goodSign() })
    ).toBe(false);
  });

  it("rejects an amount altered by a cent", () => {
    expect(
      verifyFreekassaNotification({
        merchantId: SHOP,
        amount: "1500.01",
        merchantOrderId: order,
        sign: goodSign(),
      })
    ).toBe(false);
  });

  it("rejects a signature built with SECRET_1 instead of SECRET_2", () => {
    const wrong = md5(`${SHOP}:${amount}:${S1}:${order}`);
    expect(
      verifyFreekassaNotification({ merchantId: SHOP, amount, merchantOrderId: order, sign: wrong })
    ).toBe(false);
  });

  it("throws when any FREEKASSA_* var is missing — including API_KEY it doesn't use", () => {
    vi.stubEnv("FREEKASSA_API_KEY", "");
    expect(() =>
      verifyFreekassaNotification({ merchantId: SHOP, amount, merchantOrderId: order, sign: goodSign() })
    ).toThrow();
  });
});

describe("buildFreekassaPaymentUrl", () => {
  it("signs md5(shop:amount:SECRET_1:currency:order) and formats whole rubles as '1500'", () => {
    const url = buildFreekassaPaymentUrl({ orderId: "ord1", amount: 1500, currency: "RUB" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("oa")).toBe("1500"); // Number(toFixed) → '1500', not '1500.00'
    const expected = md5(`${SHOP}:1500:${S1}:RUB:ord1`);
    expect(parsed.searchParams.get("s")).toBe(expected);
    expect(parsed.searchParams.get("m")).toBe(SHOP);
    expect(parsed.searchParams.get("o")).toBe("ord1");
  });

  it("rejects a custom param key that isn't ^us_[a-zA-Z0-9]+$", () => {
    expect(() =>
      buildFreekassaPaymentUrl({ orderId: "o", amount: 100, custom: { foo: "x" } })
    ).toThrow();
    expect(() =>
      buildFreekassaPaymentUrl({ orderId: "o", amount: 100, custom: { "us_ dash": "x" } })
    ).toThrow();
  });

  it("accepts a valid us_ custom param", () => {
    const url = buildFreekassaPaymentUrl({ orderId: "o", amount: 100, custom: { us_ref: "abc" } });
    expect(new URL(url).searchParams.get("us_ref")).toBe("abc");
  });
});

describe("createFreekassaOrder (API 2.0)", () => {
  it("signs HMAC-SHA256 over alphabetically-sorted values joined by '|'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "success", location: "https://pay/x", orderId: 7 }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await createFreekassaOrder({
      orderId: "ord9",
      amount: 1500,
      email: "c@x.ru",
      ip: "1.2.3.4",
    });
    expect(res.location).toBe("https://pay/x");
    expect(res.fkOrderId).toBe(7);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    const { signature, ...rest } = body;
    const expected = crypto
      .createHmac("sha256", API)
      .update(
        Object.keys(rest)
          .sort()
          .map((k) => String(rest[k] ?? ""))
          .join("|")
      )
      .digest("hex");
    expect(signature).toBe(expected);
  });

  it("throws on a non-JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })));
    await expect(
      createFreekassaOrder({ orderId: "o", amount: 1, email: "c@x.ru", ip: "1.2.3.4" })
    ).rejects.toThrow(/Non-JSON/);
  });

  it("throws when type !== 'success'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ type: "error", message: "no" }), { status: 200 }))
    );
    await expect(
      createFreekassaOrder({ orderId: "o", amount: 1, email: "c@x.ru", ip: "1.2.3.4" })
    ).rejects.toThrow(/failed/i);
  });
});

describe("shouldCheckNotifyIp", () => {
  it("is true only when FREEKASSA_CHECK_IP === 'true'", () => {
    vi.stubEnv("FREEKASSA_CHECK_IP", "true");
    expect(shouldCheckNotifyIp()).toBe(true);
    vi.stubEnv("FREEKASSA_CHECK_IP", "false");
    expect(shouldCheckNotifyIp()).toBe(false);
    vi.stubEnv("FREEKASSA_CHECK_IP", "");
    expect(shouldCheckNotifyIp()).toBe(false);
  });
});

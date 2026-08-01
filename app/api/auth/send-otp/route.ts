import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { otps, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifySmartCaptcha } from "@/lib/smartcaptcha";
import { checkRateLimit, recordRateLimitHit, getClientIp } from "@/lib/rateLimit";

// Email sends are the expensive, abusable resource here, so limit by both the
// source IP and the target email. Checked AFTER the captcha so the budget only
// counts real (human-solved) send attempts, not unsolved probes.
const OTP_WINDOW_MS = 15 * 60_000;
const OTP_PER_EMAIL = 5;
const OTP_PER_IP = 20;

export async function POST(req: Request) {
  try {
    const { email, username, captchaToken } = await req.json();

    if (!email || !username) {
      return NextResponse.json({ error: "Отсутствуют email или имя пользователя" }, { status: 400 });
    }

    // Gate the OTP send behind the captcha — verify before touching the DB or
    // sending any email, so bots can't probe or spam through this endpoint.
    const clientIp = getClientIp(req.headers);
    const captchaOk = await verifySmartCaptcha(captchaToken, clientIp === "unknown" ? undefined : clientIp);
    if (!captchaOk) {
      return NextResponse.json({ error: "Проверка капчи не пройдена. Попробуйте ещё раз." }, { status: 400 });
    }

    // Throttle actual sends per IP and per target email.
    const ipKey = `otp:ip:${clientIp}`;
    const emailKey = `otp:email:${String(email).toLowerCase().trim()}`;
    const ipCheck = checkRateLimit(ipKey, OTP_PER_IP, OTP_WINDOW_MS);
    const emailCheck = checkRateLimit(emailKey, OTP_PER_EMAIL, OTP_WINDOW_MS);
    if (!ipCheck.success || !emailCheck.success) {
      const retryAfter = Math.max(ipCheck.retryAfterSec, emailCheck.retryAfterSec);
      return NextResponse.json(
        { error: "Слишком много запросов на отправку кода. Попробуйте позже." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    recordRateLimitHit(ipKey, OTP_WINDOW_MS);
    recordRateLimitHit(emailKey, OTP_WINDOW_MS);

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
    }
    if (existingUsername.length > 0) {
      return NextResponse.json({ error: "Это имя пользователя уже занято" }, { status: 409 });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in DB (Upsert)
    // Drizzle doesn't have a simple upsert cross-driver yet, so let's delete and insert
    await db.delete(otps).where(eq(otps.email, email));

    await db.insert(otps).values({
      email,
      code,
      expiresAt,
    });

    // Send email (shared transporter + branded template in lib/email).
    const { sendOtpEmail } = await import("@/lib/email");
    await sendOtpEmail(email, code, username);

    return NextResponse.json({ message: "Код отправлен" }, { status: 200 });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Не удалось отправить код" }, { status: 500 });
  }
}

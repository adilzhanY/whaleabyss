import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users, otps } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { enforceRateLimit, RATE_TIERS } from "@/lib/apiRateLimit";
import { normalizeEmail } from "@/lib/normalizeEmail";

// A wrong guess used to cost nothing: expiry was checked AFTER the code match
// and the row was deleted ONLY on success, so the same code could be hammered
// until the `auth` tier ran out — ~11k attempts/day from one IP against a 1e6
// keyspace. Five misses now burn the code. Combined with send-otp's 5 sends per
// email per 15 min that caps a target at ~25 guesses per window. See
// AUDIT_FINDINGS §1.4.
const OTP_MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const limited = enforceRateLimit(req, "register", RATE_TIERS.auth);
    if (limited) return limited;

    const body = await req.json();
    const { username, password, otp } = body;

    if (!username || !body.email || !password || !otp) {
      return NextResponse.json({ error: "Отсутствуют обязательные поля" }, { status: 400 });
    }

    // Identity key — must match how `authorize()` and send-otp spell it, or the
    // account is created at an address nothing can look up again.
    const email = normalizeEmail(String(body.email));

    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль должен быть не менее 6 символов" }, { status: 400 });
    }

    // Verify OTP
    const validOtpRecord = await db.select().from(otps).where(eq(otps.email, email)).limit(1);
    const otpEntry = validOtpRecord[0];

    if (!otpEntry) {
      return NextResponse.json({ error: "Код подтверждения не найден. Запросите новый." }, { status: 400 });
    }

    // Expiry BEFORE the code comparison, and the dead row goes away with it —
    // otherwise an expired code sits there absorbing guesses for free.
    if (new Date() > new Date(otpEntry.expiresAt)) {
      await db.delete(otps).where(eq(otps.email, email));
      return NextResponse.json({ error: "Код истек. Запросите новый." }, { status: 400 });
    }

    if (otpEntry.code !== otp) {
      // Atomic increment: two concurrent guesses must not both read the same
      // count and slip past the cap.
      const [bumped] = await db
        .update(otps)
        .set({ attempts: sql`${otps.attempts} + 1` })
        .where(eq(otps.email, email))
        .returning({ attempts: otps.attempts });

      if ((bumped?.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
        await db.delete(otps).where(eq(otps.email, email));
        return NextResponse.json(
          { error: "Слишком много неверных попыток. Запросите новый код." },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      username,
      email,
      receiptEmail: email,
      passwordHash,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email
    });

    // Cleanup OTP after successful registration
    await db.delete(otps).where(eq(otps.email, email));

    return NextResponse.json({ message: "Успешная регистрация", user: newUser }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: "Имя пользователя или email уже заняты" }, { status: 409 });
    }
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
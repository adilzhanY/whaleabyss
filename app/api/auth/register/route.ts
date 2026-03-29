import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users, otps } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, otp } = body;

    if (!username || !email || !password || !otp) {
      return NextResponse.json({ error: "Отсутствуют обязательные поля" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль должен быть не менее 6 символов" }, { status: 400 });
    }

    // Verify OTP
    const validOtpRecord = await db.select().from(otps).where(eq(otps.email, email)).limit(1);
    const otpEntry = validOtpRecord[0];

    if (!otpEntry) {
      return NextResponse.json({ error: "Код подтверждения не найден. Запросите новый." }, { status: 400 });
    }

    if (otpEntry.code !== otp) {
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    if (new Date() > new Date(otpEntry.expiresAt)) {
      return NextResponse.json({ error: "Код истек. Запросите новый." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      username,
      email,
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
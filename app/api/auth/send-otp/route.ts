import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { otps, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, username } = await req.json();

    if (!email || !username) {
      return NextResponse.json({ error: "Отсутствуют email или имя пользователя" }, { status: 400 });
    }

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

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || "465", 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Whale Abyss Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Ваш код подтверждения - Whale Abyss",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1e3a8a; text-align: center;">Добро пожаловать в Whale Abyss!</h2>
          <p>Привет, <strong>${username}</strong>!</p>
          <p>Для завершения регистрации введите следующий код подтверждения:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 15px 30px; border-radius: 8px; letter-spacing: 5px; color: #1e3a8a;">${code}</span>
          </div>
          <p>Код действителен в течение 15 минут.</p>
          <p>Если вы не запрашивали этот код, просто проигнорируйте данное письмо.</p>
          <br />
          <p style="font-size: 12px; color: #777; text-align: center;">С уважением,<br/>Команда Whale Abyss</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Код отправлен" }, { status: 200 });
  } catch (error: any) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Не удалось отправить код" }, { status: 500 });
  }
}

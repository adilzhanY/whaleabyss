import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Check if user exists
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'Если аккаунт с таким email существует, на него будет отправлено письмо для сброса пароля'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this email
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    // Store new token
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expiresAt,
    });

    // Send reset email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '465', 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Whale Abyss Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Сброс пароля - Whale Abyss',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1e3a8a; text-align: center;">Сброс пароля</h2>
          <p>Здравствуйте!</p>
          <p>Вы запросили сброс пароля для вашего аккаунта на Whale Abyss.</p>
          <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Сбросить пароль
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Или скопируйте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #1e3a8a; font-size: 12px;">${resetUrl}</p>
          <p style="color: #e74c3c; font-weight: bold; margin-top: 20px;">⚠️ Эта ссылка действительна в течение 1 часа.</p>
          <p style="color: #666; font-size: 14px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.</p>
          <br />
          <p style="font-size: 12px; color: #777; text-align: center;">С уважением,<br/>Команда Whale Abyss</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'Если аккаунт с таким email существует, на него будет отправлено письмо для сброса пароля'
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return NextResponse.json({ error: 'Не удалось отправить письмо' }, { status: 500 });
  }
}

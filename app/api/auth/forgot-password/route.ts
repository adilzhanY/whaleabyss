import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { checkRateLimit, recordRateLimitHit, getClientIp } from '@/lib/rateLimit';
import { normalizeEmail } from '@/lib/normalizeEmail';

// Throttle reset emails by source IP and target email to prevent inbox-bombing
// and email-quota abuse. (The route already returns a uniform response to avoid
// account enumeration.)
const RESET_WINDOW_MS = 15 * 60_000;
const RESET_PER_EMAIL = 3;
const RESET_PER_IP = 15;

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Identity key: the user lookup below and the token row must agree with how
    // register/authorize spell the address, or a reset mail is never sent (and
    // the uniform response makes that indistinguishable from "no such account").
    const email = normalizeEmail(rawEmail);

    const clientIp = getClientIp(req.headers);
    const ipKey = `reset:ip:${clientIp}`;
    const emailKey = `reset:email:${email}`;
    const ipCheck = checkRateLimit(ipKey, RESET_PER_IP, RESET_WINDOW_MS);
    const emailCheck = checkRateLimit(emailKey, RESET_PER_EMAIL, RESET_WINDOW_MS);
    if (!ipCheck.success || !emailCheck.success) {
      const retryAfter = Math.max(ipCheck.retryAfterSec, emailCheck.retryAfterSec);
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
    recordRateLimitHit(ipKey, RESET_WINDOW_MS);
    recordRateLimitHit(emailKey, RESET_WINDOW_MS);

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

    // Send reset email (shared transporter + branded template in lib/email).
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    const { sendPasswordResetEmail } = await import('@/lib/email');
    await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({
      message: 'Если аккаунт с таким email существует, на него будет отправлено письмо для сброса пароля'
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return NextResponse.json({ error: 'Не удалось отправить письмо' }, { status: 500 });
  }
}

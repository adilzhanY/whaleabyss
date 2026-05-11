import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
    }

    // Find token in database
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (!resetToken) {
      return NextResponse.json({ error: 'Неверный или истёкший токен' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date() > new Date(resetToken.expiresAt)) {
      // Delete expired token
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return NextResponse.json({ error: 'Токен истёк. Запросите новый сброс пароля' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, resetToken.email));

    // Delete used token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return NextResponse.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return NextResponse.json({ error: 'Не удалось сбросить пароль' }, { status: 500 });
  }
}

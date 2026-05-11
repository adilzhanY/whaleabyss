import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { cartItems } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * DELETE /api/cart/clear
 * Clear cart items from database for logged-in user
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const userId: string | null = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Delete all cart items for this user
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cart Clear Error]', error);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}

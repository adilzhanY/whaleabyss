import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/requireAdmin';
import { validatePromocodeForUser } from '@/lib/promocodeValidation';

/**
 * Admin-only promocode preview for the manual-order form. Validates a code
 * against the chosen customer (not the admin) so the form can show the
 * discount and final price before the order is created.
 */
export async function POST(req: NextRequest) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const body = await req.json().catch(() => null);
  const code = body?.code;
  const userId = body?.userId;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Промокод не указан' }, { status: 400 });
  }
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Сначала выберите клиента' }, { status: 400 });
  }

  const result = await validatePromocodeForUser(code, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    discountPercent: result.discountPercent,
  });
}

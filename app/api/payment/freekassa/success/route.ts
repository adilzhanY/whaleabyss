import { NextRequest, NextResponse } from 'next/server';

/**
 * Freekassa returns the user here after a successful payment.
 * FK attaches `MERCHANT_ORDER_ID` (our UUID) as a query param (GET) or form field (POST).
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('MERCHANT_ORDER_ID');
  const target = orderId ? `/?order=${orderId}&status=success` : '/';
  return NextResponse.redirect(new URL(target, req.url));
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const orderId =
    (form?.get('MERCHANT_ORDER_ID') as string | null) ??
    req.nextUrl.searchParams.get('MERCHANT_ORDER_ID');
  const target = orderId ? `/?order=${orderId}&status=success` : '/';
  return NextResponse.redirect(new URL(target, req.url));
}

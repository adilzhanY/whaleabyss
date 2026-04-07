import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Typical Freekassa params: intid, MERCHANT_ORDER_ID
  const url = new URL(request.url);
  const orderId = url.searchParams.get('MERCHANT_ORDER_ID');

  // Redirect the user to a success page or user profile so they see their active orders
  const responseUrl = orderId ? `/profile?order=${orderId}&status=success` : `/profile`;

  return NextResponse.redirect(new URL(responseUrl, request.url));
}

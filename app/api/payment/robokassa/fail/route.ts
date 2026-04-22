import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Typical Robokassa params: OutSum, InvId
  const url = new URL(request.url);
  const orderId = url.searchParams.get('InvId');

  // Redirect the user to somewhere that makes sense (like cart or profile) with an error param
  const responseUrl = orderId ? `/profile?order=${orderId}&status=failed` : `/cart`;

  return NextResponse.redirect(new URL(responseUrl, request.url));
}
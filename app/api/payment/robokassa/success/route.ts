import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Robokassa will pass Shp_id with our UUID, and InvId with their generated order ID
  const orderId = url.searchParams.get('Shp_id');

  // Redirect the user to a success page or user profile so they see their active orders
  const responseUrl = orderId ? `/profile?order=${orderId}&status=success` : `/profile`;

  return NextResponse.redirect(new URL(responseUrl, request.url));
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const orderId = formData?.get('Shp_id') as string | null;

  const responseUrl = orderId ? `/profile?order=${orderId}&status=success` : `/profile`;
  return NextResponse.redirect(new URL(responseUrl, request.url));
}
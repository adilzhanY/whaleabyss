import { NextRequest, NextResponse } from 'next/server';
import { runOrderCleanup } from '@/lib/orderCleanup';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint — call hourly.
 *
 * Auth: pass `Authorization: Bearer ${CRON_SECRET}` (matches the
 * `CRON_SECRET` env var). Vercel cron sends this header automatically when
 * the secret is set; for external schedulers / system cron, set the header
 * manually.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron/cleanup-orders] CRON_SECRET is not set');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const header = req.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const result = await runOrderCleanup();
    console.log('[cron/cleanup-orders]', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/cleanup-orders] failed:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

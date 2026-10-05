import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { sendMorningReminders } from '@/lib/server/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Hourly job (Cloud Scheduler, see README): sends the morning reminder to everyone whose chosen
 * local hour has just started. Protected by a shared secret, not by a user session.
 */
export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const result = await sendMorningReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/morning] failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { sweepAbandoned } from '@/server/abandoned';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Called every few minutes by a scheduler (and safe to call by anyone: it only sends reminders that are due, once each). */
export async function GET() {
  const r = await sweepAbandoned().catch((e) => {
    console.error('[abandoned] cron', e);
    return null;
  });
  return NextResponse.json({ ok: !!r, ...r });
}

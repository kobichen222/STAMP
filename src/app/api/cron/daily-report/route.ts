import { NextResponse } from 'next/server';
import { sendDailyReport } from '@/server/daily-report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The 08:00 production-queue e-mail. Vercel Cron calls it at 05:00 and 06:00 UTC (Israel is UTC+2 in
 * winter, +3 in summer) with `Authorization: Bearer $CRON_SECRET`; only the call that lands at 08:00
 * Israel time sends, once a day. `?test=1&to=a@b,c@d` sends a marked test copy right away.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const test = url.searchParams.get('test') === '1';
  const to = (url.searchParams.get('to') ?? '').split(',').map((s) => s.trim()).filter((s) => s.includes('@'));
  if (!test) {
    const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }));
    if (hour !== 8) return NextResponse.json({ sent: false, reason: `not 08:00 in Israel (${hour})` });
  }
  try {
    return NextResponse.json(await sendDailyReport({ force: test, to: test ? to : undefined }));
  } catch (e) {
    console.error('[daily-report]', e);
    return NextResponse.json({ sent: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

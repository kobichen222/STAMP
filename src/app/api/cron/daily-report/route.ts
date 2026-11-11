import { NextResponse } from 'next/server';
import { claimOnce, reportRecipients, sendDailyReport } from '@/server/daily-report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The 08:00 production-queue e-mail. Vercel Cron calls it at 05:00 and 06:00 UTC (Israel is UTC+2 in
 * winter, +3 in summer); only the call that lands at 08:00 Israel time sends, once a day – so it is safe
 * for anyone to call. `?test=1` sends a marked copy now to DAILY_REPORT_TEST_TO (else the usual
 * recipients), at most once every 10 minutes. Recipients never come from the request.
 */
export async function GET(req: Request) {
  const test = new URL(req.url).searchParams.get('test') === '1';
  try {
    if (test) {
      const slot = Math.floor(Date.now() / 600_000);
      if (!(await claimOnce(`daily-report-test:${slot}`))) return NextResponse.json({ sent: false, reason: 'a test was sent in the last 10 minutes' }, { status: 429 });
      const to = (process.env.DAILY_REPORT_TEST_TO ?? '').split(/[,;\s]+/).filter((s) => s.includes('@'));
      return NextResponse.json(await sendDailyReport({ force: true, to: to.length ? to : reportRecipients() }));
    }
    const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }));
    if (hour !== 8) return NextResponse.json({ sent: false, reason: `not 08:00 in Israel (${hour})` });
    return NextResponse.json(await sendDailyReport());
  } catch (e) {
    console.error('[daily-report]', e);
    return NextResponse.json({ sent: false, error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

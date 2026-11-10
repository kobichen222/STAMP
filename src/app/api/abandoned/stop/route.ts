import { SITE } from '@/lib/config';
import { unsubscribeCart } from '@/server/abandoned';

/** "Don't send me reminders" link from the e-mail. */
export async function GET(req: Request) {
  const ok = await unsubscribeCart(new URL(req.url).searchParams.get('c') ?? '').catch(() => false);
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>הסרה מתזכורות</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f2f5fa;font:16px/1.7 Heebo,Arial,sans-serif;color:#1c2a44">
<div style="background:#fff;border-radius:20px;padding:32px 28px;max-width:420px;text-align:center;box-shadow:0 10px 40px -20px rgba(11,20,38,.3)">
<h1 style="margin:0 0 10px;font-size:22px">${ok ? 'הוסרת מהתזכורות' : 'הקישור לא תקין'}</h1>
<p style="margin:0 0 20px;color:#5b6678">${ok ? 'לא נשלח לך יותר תזכורות על הזמנות שלא הושלמו.' : 'ייתכן שהקישור פג. אפשר לפנות אלינו ונסיר אותך ידנית.'}</p>
<a href="${SITE.url}" style="display:inline-block;background:#2457ff;color:#fff;text-decoration:none;border-radius:12px;padding:12px 22px;font-weight:700">לאתר</a>
</div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

# פריסה ל־Vercel והעלייה לאוויר

## 1. יצירת הפרויקט
1. ב־Vercel: **Add New → Project → Import** את `kobichen222/STAMP`. Framework: Next.js (אוטומטי).
2. **Environment Variables** (Production + Preview, ראו `.env.example`):
   - חובה ל־Production: `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `ORDERS_EMAIL_TO`, `ADMIN_PASSWORD`, `PRODUCTION_PASSWORD`, `ADMIN_SECRET`.
   - אופציונלי: `ANTHROPIC_API_KEY` (עוזר AI), `PRICING_COUPONS`.
   - סודות Production לא מוגדרים ל־Preview (spec §215) – ל־Preview השתמשו ב־Supabase נפרד (staging).
3. כל Pull Request מקבל Preview Deployment; merge ל־main → Production.

## 2. Supabase
1. פרויקט חדש (אזור אירופה). SQL Editor → להריץ `supabase/migrations/0001_init.sql`.
2. הקובץ יוצר את טבלת `orders` ואת ה־bucket הפרטי `production-files`.
3. להעתיק את `Project URL` ו־`service_role key` למשתני הסביבה (לעולם לא לחשוף בצד לקוח).
4. גיבויים: Supabase Pro כולל גיבוי יומי + PITR. הקבצים ב־Storage אינם נמחקים אוטומטית.

ללא Supabase האתר עובד, אבל ההזמנות נשמרות בדיסק זמני – מתאים לפיתוח בלבד (Dashboard מציג אזהרה).

## 3. אימייל (Resend)
לאמת את הדומיין stamp2go.co.il ב־Resend (רשומות SPF/DKIM ב־DNS), ואז `MAIL_FROM="Stamp2Go <orders@stamp2go.co.il>"`.
כל הזמנה נשלחת לסטודיו עם קבצי ה־PDF/SVG מצורפים – כך אפשר לעבוד גם לפני שמתרגלים לאדמין.

## 4. מדיה מהאתר הישן
לפני כיבוי WordPress: `npm run media:download` → commit ל־`public/wp-content/uploads` (או העלאה ל־Blob).
עד אז קיים fallback שמביא תמונות חסרות מ־`WP_MEDIA_ORIGIN`.

## 5. דומיין, SSL ו־DNS Cutover
1. Vercel → Project → Settings → Domains: להוסיף `www.stamp2go.co.il` ו־`stamp2go.co.il` (redirect ל־www – נשמר ה־Canonical הקיים).
2. SSL מונפק אוטומטית (Let's Encrypt). HSTS מוגדר ב־`next.config.ts`.
3. להוריד TTL של רשומות ה־DNS ל־300 שניות יום לפני.
4. **Launch freeze** – להקפיא שינויים ב־WordPress, להריץ ייבוא אחרון (`npm run import:wp`) ו־media download.
5. להחליף רשומות: `A @ 76.76.21.21`, `CNAME www cname.vercel-dns.com` (לפי ההנחיות במסך Domains).
6. **Rollback**: לא למחוק את WordPress ביום ההשקה; חזרה = החזרת רשומות ה־DNS.

## 6. בדיקות אחרי עלייה (spec §230)
- [ ] `npm run redirects:check -- https://www.stamp2go.co.il` – כל 118 ההפניות 301 → 200
- [ ] `/robots.txt`, `/sitemap.xml` – תקינים; ב־Preview ה־robots חוסם אינדוקס
- [ ] Google Search Console: הגשת sitemap, בדיקת Coverage
- [ ] דף בית, קטגוריה, מוצר, מעצב (דסקטופ + iPhone + Android)
- [ ] הזמנת ניסיון מלאה → מייל ללקוח ולסטודיו → אדמין → הורדת PDF/SVG → **פתיחה ב־CorelDRAW** → החתמה בפועל
- [ ] Lighthouse: LCP < 2s, CLS ≈ 0, INP < 200ms (Vercel Speed Insights)

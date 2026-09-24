# Stamp2Go – Digital Stamp Production Platform

אתר ומערכת אונליין לעיצוב, הזמנה והכנה לייצור של חותמות – מחליף את אתר ה־WordPress של stamp2go.co.il ורץ על Vercel.

**Commerce + Online Designer + Prepress + Production** במערכת אחת:
לקוח → עיצוב אונליין → בדיקה אוטומטית → הזמנה → קובץ Production → תור ייצור.

## מה יש כאן

| אזור | נתיב | תיאור |
|---|---|---|
| דף הבית | `/` | Hero עם חותמת תלת־ממדית שמתפרקת ומתחברת בגלילה (Three.js, נטען Lazy) |
| קטלוג | `/stamps`, `/stamps/[category]` | 21 עמודי נחיתה לפי שימוש + סינון (סוג, מידה, שורות, צורה, מחיר) |
| מוצר | `/stamp/[slug]` | Configurator: טביעה במידה אמיתית, צבע גוף/דיו, כמות, מפרט |
| מעצב | `/designer`, `/designer/[product]` | עורך מלא (ראו למטה) |
| תבניות / דוגמאות | `/templates`, `/examples` | גלריות עם "עצב חותמת דומה" |
| תוכן | `/how-it-works`, `/about`, `/faq`, `/contact` | + עמודי WordPress שנשארו בכתובתם |
| מסחר | `/cart`, `/checkout`, `/order/[id]` | סל, קופה, אישור + מעקב + אישור הגהה |
| אזור אישי | `/account` | העיצובים שלי, ההזמנות שלי, איתור הזמנה |
| ניהול | `/admin` | Dashboard, הזמנות, תור ייצור, הורדת קבצים |

### מעצב החותמות
Canvas במ"מ אמיתיים · Safe Area · Guides + Snapping · Grid · Zoom/Pinch · Undo/Redo · גרירה, שינוי גודל וסיבוב · עריכה ישירה · טקסט (8 גופנים עבריים, מודגש/נטוי/קו תחתון, יישור, ריווחים, רוחב, קשת עליונה/תחתונה) · לוגו (PNG/JPG/SVG/PDF, הסרת רקע, Threshold, Invert, ניגודיות, Crop, Vectorize, מדד איכות) · אייקונים, צורות, מסגרות, שכבות, נעילה · תבניות · עוזר AI (3 הצעות) · "שפר את הסידור" · Preflight בזמן אמת + "תקן עבורי" · תצוגה מקדימה (קובץ / נייר עם אפקט החתמה / במוצר) · וריאציות מ־CSV · שמירה אוטומטית + היסטוריית גרסאות · מובייל עם Bottom Sheet · מצב פשוט/מתקדם · קיצורי מקלדת.

### מנוע הייצור
- כל הטקסט מומר לקווים (opentype.js) עם סידור דו־כיווני לעברית – CorelDRAW לא צריך גופנים, RTL או shaping.
- **Production SVG** + **PDF וקטורי** (CMYK 0/0/0/100, עמוד = מידת החותמת 1:1) + EPS אופציונלי + **Master SVG** (עם שמות אובייקטים ו־JSON של העיצוב) + Metadata JSON.
- Production Profile לכל SKU: שוליים, גופן מינימלי, עובי קו מינימלי, Mirror, פורמטים, אישור לקוח.
- השרת מייצר את הקבצים מחדש מתוך ה־Design JSON – לא סומכים על קבצים מהדפדפן.
- שמות קבצים: `ORD-260924-AB12_KVBY-KHN_58x22_BLACK.pdf`.

## פיתוח

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 29 בדיקות: bidi, מנוע, preflight, קבצי ייצור, תמחור, Golden files
npm run typecheck
npm run build
```

| סקריפט | |
|---|---|
| `npm run import:wp` | ייבוא מחדש של `wordpress-export/export.xml` → `content/*.json` |
| `npm run media:download` | הורדת כל התמונות מהאתר הישן ל־`public/wp-content/uploads` (להריץ לפני כיבוי WordPress) |
| `npm run redirects:check -- https://<preview>` | בדיקת כל 118 ההפניות 301 מול סביבה חיה |
| `npm run golden:update` | עדכון Golden files אחרי שינוי מכוון במנוע |

## מבנה

```
content/            תוכן שיובא מ־WordPress (עמודים, מוצרים, קטגוריות, תפריטים, הפניות)
src/designer/       מנוע החותמות: geometry, fonts, bidi, render, validate, autofix, production, logo, editor/
src/lib/            קטלוג, קטגוריות, תמחור, סל, עיצובים שמורים
src/server/         הזמנות, מנוע ייצור בשרת, אחסון (Supabase/קבצים), התראות, תשלום, הרשאות צוות
src/app/            עמודים ו־API (Next.js App Router)
supabase/           סכמת מסד נתונים
tests/              בדיקות + golden/
docs/               DEPLOYMENT.md · PRODUCTION.md · ROADMAP.md · redirect-map.csv
```

פריסה: ראו [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). ייצור ו־CorelDRAW: [docs/PRODUCTION.md](docs/PRODUCTION.md).

# סטטוס מול האפיון

## ✅ נבנה (Phase 1 – MVP)
- אתר חדש ב־Next.js על Vercel, Design System (לבן/Navy/Electric Blue), RTL, מובייל
- ייבוא מלא מ־WordPress: 30 עמודים, 71 מוצרים, קטגוריות, תפריטים, תוכן SEO
- 118 הפניות 301 (עמודים, מוצרים, קטגוריות, `?p=`, `?page_id=`), Sitemap, Robots, Canonical, OG
- Schema: Product/Offer, BreadcrumbList, FAQPage, Store/LocalBusiness, ItemList
- Hero תלת־ממדי בגלילה (Lazy, Reduced motion, fallback), איך זה עובד, קטגוריות, תבניות, דוגמאות, FAQ, אודות, צור קשר
- מעצב מלא (Canvas, טקסט, לוגו + וקטוריזציה, אייקונים, צורות, מסגרות, שכבות, תבניות, AI, Preflight + Auto-fix, Preview, CSV, גרסאות)
- מנוע ייצור: SVG/PDF/EPS/Master/Metadata, Production Profiles, Golden files
- סל, קופה (B2B, PO, קופון, משלוח/איסוף), מנוע תמחור (מדרגות כמות, תוספות, קופונים, מע"מ)
- מצבי הזמנה + Audit Log, אישור הגהה ללקוח, מעקב הזמנה, התראות מייל עם מניעת כפילויות
- אדמין: Dashboard + בריאות מערכת, הזמנות וחיפוש, מסך הזמנה, תור ייצור (התחל/הושלם לעובד), הורדות פרטיות
- אבטחה: בדיקת קבצים לפי חתימה, Sanitize ל־SVG, קבצי ייצור פרטיים, Rate limiting, Honeypot, Headers

## ⏳ ממתין להחלטה / חיבור
| נושא | מה צריך |
|---|---|
| סליקה | בחירת חברת סליקה (hosted page + webhook). הממשק מוכן ב־`src/server/payments.ts`; כרגע תשלום טלפוני/באיסוף |
| מסד נתונים | יצירת פרויקט Supabase והרצת המיגרציה |
| אימייל | מפתח Resend + אימות דומיין |
| חשבונית/קבלה | בחירת ספק (למשל חשבונית ירוקה / iCount) |
| משלוחים | ספק שליחויות ומחירים אמיתיים (כרגע ברירת מחדל ₪35 / ₪60 – לעדכן) |
| מדרגות כמות / מחירים | לאשר את ברירות המחדל ב־`src/lib/pricing.ts` (5%/10%/15%) |
| Mirror ופרופילי ייצור | לאמת מול קובץ CDR אמיתי והמכונה (docs/PRODUCTION.md) |

## Phase 2
חשבונות משתמש (Supabase Auth, Magic link) וסנכרון עיצובים · WhatsApp · B2B מלא (חברות, תפקידים, מחירונים, תנאי תשלום) · XLSX בנוסף ל־CSV · מלאי ו־BOM · הרשאות לפי פעולה · תבניות הודעות עריכות · Analytics Funnel · Abandoned designs · Refund מהאדמין

## Phase 3
חיבור ישיר למכונה (PLT/DXF/BMP) · ניתוב ייצור אוטומטי · Configurator תלת־ממדי למוצר · פורטלים ארגוניים · API

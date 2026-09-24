# מנוע הייצור ו־CorelDRAW

## העיקרון
האתר מייצר קבצים וקטוריים סטנדרטיים ש־CorelDRAW פותח במלואם – **לא CDR**:

```
עיצוב באתר → Design JSON → Production Engine (שרת) → Preflight → SVG + PDF (+EPS) → CorelDRAW / מכונה
```

CorelDRAW 2026 מייבא SVG ו־PDF כאובייקטים ניתנים לעריכה (כולל שמות אובייקטים ב־SVG), ומאפשר לשמור CDR לארכיון אם רוצים.
בעתיד (Phase 3) אותו מנוע יכול לייצא ישירות פורמט מכונה (PLT/DXF/BMP) ולדלג על Corel.

## Stamp Production Profile
| | |
|---|---|
| Units | mm, Scale 1:1 |
| Artboard / עמוד | בדיוק מידת שטח ההחתמה (למשל 58×22 מ"מ) |
| Text | מומר לקווים (Curves) – לא נדרשים גופנים, RTL או shaping |
| Color | שחור 100% (PDF/EPS: CMYK 0/0/0/100, SVG: `#000000`); צבע הדיו נשמר ב־Metadata בלבד |
| Background | שקוף |
| Objects | צורות מלאות בלבד (Fill), ללא Stroke/Outline, ללא אפקטים/צללים/שקיפות |
| Min line | 0.2 מ"מ (שגיאה), 0.3 מ"מ (אזהרה) |
| Min font | 6pt רגיל · 5.5pt חותמות קטנות · 7pt חותמות גדולות |
| Safe margin | 1 מ"מ (0.8 קטנות, 1.2 עגולות) |
| Mirror | לפי Profile (כרגע כבוי – **לאמת מול המכונה**) |

הקוד: `src/designer/profiles.ts` (חוקים לכל SKU), `src/designer/production.ts` (SVG/PDF/EPS), `src/server/production-engine.ts` (הרצה בשרת).

## הקבצים בכל הזמנה
| קובץ | שימוש |
|---|---|
| `…_1.svg` | Production SVG – נקי, שטוח, Mirror לפי Profile |
| `…_1.pdf` | Production PDF וקטורי – מומלץ לפתיחה ב־Corel |
| `…_1_master.svg` | Master – לא הפוך, שמות אובייקטים, JSON מלא של העיצוב ב־`<metadata>` |
| `…_1.json` | Metadata: Order, Product, Width/Height, Ink, Quantity, Customer, Design Version, Profile |
| `…_1.eps` | רק אם ה־Profile דורש (תהליכים ישנים) |

## מה חייבים לאמת לפני השקה (spec §234–238)
לקחת 5 חותמות אמיתיות שיוצרו בהצלחה (מלבנית, מלבנית עם לוגו, עגולה, חתימה, מורכבת) ומכל אחת:
1. קובץ ה־CDR, תמונה של ההחתמה, דגם ומידות.
2. ב־Corel: גרסה, Page Size, Text או Curves, Mirror, צבע, Outline/Fill, רזולוציה, שכבות.
3. המכונה: יצרן, דגם, תוכנה/דרייבר, איך Corel שולח אליה, **איזה פורמט היא מקבלת**, Mirror/Negative בצד הדרייבר.

אחרי הבדיקה: לעדכן `mirror`, מינימום גופן/קו ושוליים ב־`profiles.ts`, להריץ `npm run golden:update`, ולפתוח ב־Corel את קבצי ה־Golden (`tests/golden/`) לאישור סופי.
**יעד:** עובד הייצור מוריד קובץ ומתחיל לייצר – בלי להזיז, להמיר, לסדר או להחליף גופן.

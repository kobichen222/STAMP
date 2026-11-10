import 'server-only';
import { SITE } from '@/lib/config';
import { emailDetails, emailHighlight, emailLayout, emailP, emailSteps } from '@/lib/email-template';
import { escapeHtml, sendMail } from '@/lib/mail';

/** Transactional e-mails outside the order flow: forms, newsletter, staff access. */

const first = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || name);

/** Contact form: the studio gets the lead, the customer a thank-you. */
export async function contactEmails(c: { name: string; phone: string; email?: string; message?: string; page?: string }) {
  await sendMail({
    subject: `פנייה חדשה מהאתר – ${c.name}`,
    replyTo: c.email || undefined,
    html: emailLayout({
      staff: true,
      badge: '✉ פנייה חדשה',
      title: `פנייה חדשה מ${c.name}`,
      body: emailDetails([
        ['שם', c.name],
        ['טלפון', c.phone],
        ['מייל', c.email],
        ['הודעה', c.message],
        ['עמוד', c.page],
      ]),
      cta: { label: 'חזרה ללקוח בוואטסאפ', url: `https://wa.me/972${c.phone.replace(/\D/g, '').replace(/^0/, '')}` },
      note: 'כל הפניות נשמרות גם בניהול → לידים.',
    }),
  });
  if (!c.email) return;
  // The lead already reached the studio – a failed thank-you must not count as a failed form.
  await sendMail({
    to: [c.email],
    subject: 'תודה! קיבלנו את הפנייה שלך',
    html: emailLayout({
      preheader: 'נחזור אליך בהקדם',
      badge: '✓ הפנייה התקבלה',
      tone: 'green',
      title: `תודה ${first(c.name)}, קיבלנו!`,
      body:
        emailP('הפנייה שלך הגיעה אלינו ונחזור אליך בהקדם – בדרך כלל תוך שעה בשעות הפעילות.') +
        (c.message ? emailDetails([['ההודעה שלך', c.message]]) : '') +
        emailP('בינתיים, אפשר כבר לעצב את החותמת אונליין ולראות אותה בזמן אמת:'),
      cta: { label: 'לעיצוב חותמת', url: `${SITE.url}/designer/` },
      note: `ממהרים? חייגו ${escapeHtml(SITE.phone)} או כתבו לנו בוואטסאפ.`,
    }),
  }).catch((e) => console.error('[contact] thank-you mail', e));
}

/** Newsletter sign-up: welcome to the subscriber, a heads-up to the studio. */
export async function newsletterEmails(email: string) {
  await sendMail({
    to: [email],
    subject: 'ברוכים הבאים לחותמות תוך 2 דקות 👋',
    html: emailLayout({
      preheader: 'נרשמת לעדכונים ולמבצעים',
      badge: '✓ נרשמת בהצלחה',
      tone: 'green',
      title: 'איזה כיף שהצטרפת!',
      body:
        emailP('מעכשיו תקבלו מאיתנו מבצעים, דגמים חדשים וטיפים לעיצוב חותמות – בלי הצפה, מבטיחים.') +
        emailSteps([
          { title: 'בוחרים דגם ומידה', text: 'עשרות חותמות – מלבניות, עגולות, תאריכונים ועוד' },
          { title: 'מעצבים אונליין', text: 'טקסט, לוגו ומסגרת – רואים בזמן אמת' },
          { title: 'מקבלים תוך 2 דקות', text: `איסוף עצמי ב${SITE.address} או משלוח עד הבית` },
        ]),
      cta: { label: 'לעיצוב החותמת הראשונה', url: `${SITE.url}/designer/` },
      note: 'רוצים להפסיק לקבל עדכונים? השיבו "הסר" למייל הזה.',
    }),
  });
  await sendMail({
    subject: `נרשם/ה חדש/ה לדיוור – ${email}`,
    html: emailLayout({ staff: true, badge: '📬 דיוור', title: 'הרשמה חדשה לדיוור', body: emailDetails([['מייל', email]]) }),
  }).catch((e) => console.error('[newsletter] staff mail', e));
}

/** Staff login code. */
export async function loginCodeEmail(email: string, code: string) {
  await sendMail({
    to: [email],
    subject: `קוד כניסה לניהול: ${code}`,
    html: emailLayout({
      staff: true,
      preheader: `הקוד שלך: ${code}`,
      badge: '🔒 כניסה מאובטחת',
      title: 'קוד הכניסה שלך לניהול',
      body: emailP('הזינו את הקוד בעמוד הכניסה:') + emailHighlight('קוד חד-פעמי', code) + emailP('הקוד תקף ל-10 דקות ולשימוש אחד בלבד.'),
      note: 'לא ביקשתם להיכנס? אפשר להתעלם מהמייל – בלי הקוד אי אפשר להיכנס.',
    }),
  });
}

/** Security heads-up after every staff login. */
export async function loginAlertEmail(email: string, role: string, meta: { ip?: string; agent?: string }) {
  await sendMail({
    to: [email],
    subject: 'כניסה חדשה לניהול האתר',
    html: emailLayout({
      staff: true,
      badge: '✓ כניסה הצליחה',
      tone: 'green',
      title: 'נכנסת לניהול האתר',
      body:
        emailDetails([
          ['משתמש', email],
          ['הרשאה', role === 'admin' ? 'מנהל' : 'ייצור'],
          ['זמן', new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })],
          ['כתובת IP', meta.ip],
          ['מכשיר', meta.agent?.slice(0, 120)],
        ]) + emailP('לא אתם? היכנסו לניהול והחליפו מיד את סיסמת המייל, ופנו אלינו.'),
      cta: { label: 'לניהול האתר', url: `${SITE.url}/admin/` },
    }),
  });
}

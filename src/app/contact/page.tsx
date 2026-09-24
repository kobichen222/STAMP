import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { PageHero } from '@/components/site/PageHero';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';

export const metadata: Metadata = {
  title: 'צור קשר – Stamp2Go רמת גן',
  description: 'Stamp2Go – הרא"ה 3 רמת גן, 03-6733-770. שעות פעילות א׳–ה׳ 09:00–17:00. השאירו פרטים ונחזור אליכם.',
  alternates: { canonical: '/contact/' },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="צור קשר" title="נשמח לעזור" lead="שאלה על דגם, הזמנה גדולה לחברה או קובץ מיוחד? השאירו פרטים או התקשרו." crumbs={[{ label: 'צור קשר' }]} />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6 sm:p-8">
          <ContactForm />
        </div>
        <div className="space-y-4">
          {[
            ['phone', 'טלפון', SITE.phone, SITE.phoneHref],
            ['whatsapp', 'וואטסאפ', 'שלחו הודעה', SITE.whatsapp],
            ['mail', 'אימייל', SITE.email, `mailto:${SITE.email}`],
            ['pin', 'כתובת', SITE.address, SITE.waze],
            ['clock', 'שעות פעילות', 'א׳–ה׳ 09:00–17:00 · ו׳ סגור', null],
          ].map(([icon, label, value, href]) => (
            <div key={label} className="card flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue">
                <Icon name={icon!} />
              </span>
              <span>
                <span className="block text-sm text-muted">{label}</span>
                {href ? (
                  <a href={href} className="font-semibold hover:text-blue" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                    {value}
                  </a>
                ) : (
                  <span className="font-semibold">{value}</span>
                )}
              </span>
            </div>
          ))}
          <iframe
            className="aspect-[4/3] w-full rounded-2xl border border-line"
            title="מפה: הרא״ה 3, רמת גן"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent('הרא"ה 3, רמת גן')}&z=16&output=embed`}
          />
        </div>
      </div>
    </>
  );
}

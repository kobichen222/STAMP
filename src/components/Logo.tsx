import { useId } from 'react';

/**
 * "חותמות 2 דקות" brand logo – vector recreation (stamp with speed lines +
 * heavy italic wordmark, gradient "2", underline swoosh). Rendered inline so it
 * stays crisp at any size and uses the site font.
 */
export function LogoMark({ className = '', size = 40 }: { className?: string; size?: number }) {
  // Unique gradient ids per instance – a hidden copy (e.g. the mobile logo) must not own the only definition.
  const uid = useId().replace(/:/g, '');
  const speed = `lg-speed-${uid}`;
  const handle = `lg-handle-${uid}`;
  return (
    <svg viewBox="0 0 170 150" width={(size * 170) / 150} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={speed} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="80" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={handle} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${speed})`} strokeLinecap="round" strokeWidth="9">
        <line x1="30" y1="36" x2="72" y2="36" />
        <line x1="8" y1="54" x2="66" y2="54" />
        <line x1="22" y1="72" x2="64" y2="72" />
        <line x1="34" y1="88" x2="66" y2="88" />
        <line x1="12" y1="104" x2="62" y2="104" />
        <line x1="30" y1="122" x2="40" y2="122" />
      </g>
      <g transform="rotate(-12 118 90)">
        {/* handle */}
        <path
          d="M96 70 C86 56 82 38 92 24 C101 12 128 10 140 18 C152 27 150 46 142 58 C137 66 137 72 144 78 Z"
          fill={`url(#${handle})`}
          stroke="#0b1426"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <ellipse cx="100" cy="30" rx="7" ry="4" fill="#fff" opacity=".85" />
        {/* body */}
        <rect x="78" y="72" width="80" height="50" rx="10" fill="#0b1426" />
        <rect x="86" y="79" width="64" height="15" rx="4" fill="#1e2b44" stroke="#e5e9f0" strokeWidth="3" />
        <rect x="86" y="99" width="64" height="18" rx="3" fill="#eef2f7" />
        <line x1="93" y1="105" x2="140" y2="105" stroke="#0b1426" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="93" y1="111" x2="132" y2="111" stroke="#0b1426" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="74" y="120" width="88" height="9" rx="4" fill="#2457ff" />
      </g>
    </svg>
  );
}

/**
 * Wordmark "חותמות תוך 2 דקות" in a compact two-line block next to the stamp
 * mark (gap of about 0.38 x the text size): "חותמות" large, "תוך 2 דקות" under
 * it at about 0.55 x, with fixed tight word gaps, aligned to the start (right)
 * edge rather than stretched. Both lines are italic; the 2 sits on a solid blue
 * badge that is skewed the same way (solid colours only – never clipped
 * gradients that can vanish). Text sizes: sm 22px, md 24px; the mark is 1.5 x the
 * text size (33px at sm, 36px at md).
 */
export function Logo({ className = '', size = 'md', markOnly = false }: { className?: string; size?: 'sm' | 'md'; markOnly?: boolean }) {
  const t = { sm: 22, md: 24 }[size];
  return (
    <span className={`inline-flex items-center select-none ${className}`} style={{ gap: Math.round(t * 0.38) }} dir="ltr" aria-label="חותמות תוך 2 דקות" role="img">
      <LogoMark size={Math.round(t * 1.5)} className="shrink-0" />
      {!markOnly && (
        <span dir="rtl" className="flex flex-col items-start leading-none whitespace-nowrap" aria-hidden>
          <span className="font-black tracking-tight text-ink italic" style={{ fontSize: t, lineHeight: 0.95 }}>
            חותמות
          </span>
          <span className="mt-[0.18em] flex items-center gap-[0.28em] font-extrabold text-ink-2 italic" style={{ fontSize: Math.round(t * 0.55) }}>
            <span>תוך</span>
            {/* SVG badge: the 2 is centred geometrically, whatever the font metrics. Rect and digit are skewed
                together around the badge centre (top leaning right, like the synthesized italic); the viewBox
                is widened by the skew offset (tan 12deg x 11 ≈ 2.34) so the corners are not clipped.
                The badge owns its text style: font style, spacing and direction are set on the digit itself, so
                nothing inherited from the italic line around it (a second slant, tracking, RTL) can move the 2
                off centre. The group's skew is the only slant. */}
            <svg viewBox="-2.5 0 25 22" className="h-[1.55em] w-auto shrink-0" aria-hidden>
              <g transform="translate(10 11) skewX(-12) translate(-10 -11)">
                <rect width="20" height="22" rx="5" fill="#2457ff" />
                <text
                  x="10"
                  y="11.6"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize="16"
                  fontWeight="900"
                  style={{
                    fontFamily: "'Heebo Variable', Heebo, Arial, sans-serif",
                    fontStyle: 'normal',
                    letterSpacing: 0,
                    wordSpacing: 0,
                    direction: 'ltr',
                    unicodeBidi: 'normal',
                  }}
                >
                  2
                </text>
              </g>
            </svg>
            <span>דקות</span>
          </span>
        </span>
      )}
    </span>
  );
}

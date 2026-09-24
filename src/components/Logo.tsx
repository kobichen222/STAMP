/**
 * "חותמות 2 דקות" brand logo – vector recreation (stamp with speed lines +
 * heavy italic wordmark, gradient "2", underline swoosh). Rendered inline so it
 * stays crisp at any size and uses the site font.
 */
export function LogoMark({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 170 150" width={(size * 170) / 150} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="lg-speed" x1="0" x2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="lg-handle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <g stroke="url(#lg-speed)" strokeLinecap="round" strokeWidth="9">
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
          fill="url(#lg-handle)"
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

export function Logo({ className = '', size = 'md', markOnly = false }: { className?: string; size?: 'sm' | 'md' | 'lg'; markOnly?: boolean }) {
  const h = { sm: 30, md: 38, lg: 52 }[size];
  const text = { sm: 'text-[21px]', md: 'text-[27px]', lg: 'text-[38px]' }[size];
  return (
    <span className={`inline-flex items-center gap-1 select-none ${className}`} dir="ltr" aria-label="חותמות 2 דקות">
      <LogoMark size={Math.round(h * 1.25)} className="-me-1" />
      {!markOnly && (
        <span className="relative inline-flex flex-col overflow-visible leading-none">
          <span dir="rtl" className={`${text} px-[0.12em] pt-[0.12em] font-black tracking-tight text-ink italic`} style={{ fontStyle: 'italic' }}>
            חותמות
            <span className="-mx-[0.1em] -my-[0.15em] inline-block bg-gradient-to-b from-[#3b82f6] to-[#1d3fbf] bg-clip-text px-[0.16em] py-[0.15em] align-[-0.06em] text-[1.35em] leading-none text-transparent [-webkit-box-decoration-break:clone]">2</span>
            דקות
          </span>
          <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="-mt-[0.1em] h-[0.3em] w-full" aria-hidden>
            <defs>
              <linearGradient id="lg-swoosh" x1="0" x2="1">
                <stop offset="0" stopColor="#1d4ed8" />
                <stop offset="1" stopColor="#1d4ed8" stopOpacity=".15" />
              </linearGradient>
            </defs>
            <path d="M0 7 Q100 2 200 1 L200 2.5 Q100 4 0 8 Z" fill="url(#lg-swoosh)" />
          </svg>
        </span>
      )}
    </span>
  );
}

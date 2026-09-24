export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`} dir="ltr">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
        <rect x="9" y="3" width="14" height="9" rx="4.5" fill="currentColor" />
        <rect x="12.5" y="11" width="7" height="6" fill="currentColor" opacity=".55" />
        <rect x="4" y="17" width="24" height="7" rx="2" fill="currentColor" />
        <rect x="4" y="26" width="24" height="3" rx="1.5" fill="var(--color-blue)" />
      </svg>
      <span className="text-[19px]">
        Stamp<span className="text-blue">2</span>Go
      </span>
    </span>
  );
}

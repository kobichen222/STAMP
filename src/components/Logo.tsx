import { LOGO_COMPACT, LOGO_FULL } from './logo-paths';

/** Rendered height in px per variant and size; width follows the artwork's aspect ratio. */
const HEIGHT = {
  compact: { sm: 24, md: 30, lg: 36 },
  // sm and md fit the site header (phone row 64px, desktop row 60px); lg is for the footer and the admin login.
  full: { sm: 42, md: 48, lg: 60 },
} as const;

/**
 * The stamp2go wordmark. "compact" is the one-line "stamp2go" (headers, menus); "full" adds the Hebrew line
 * "חותמות תוך 2 דקות" under it, sharing the blue 2.
 * The shapes are fixed SVG paths generated from the font files, so the logo never depends on webfont loading.
 * To change it, edit scripts/generate-logo.mjs and run `node scripts/generate-logo.mjs` (rewrites logo-paths.ts
 * and the SVGs in public/).
 */
export function Logo({ className = '', size = 'md', variant = 'compact' }: { className?: string; size?: 'sm' | 'md' | 'lg'; variant?: 'compact' | 'full' }) {
  const logo = variant === 'full' ? LOGO_FULL : LOGO_COMPACT;
  const height = HEIGHT[variant][size];
  const width = Math.round(((height * logo.width) / logo.height) * 100) / 100;
  return (
    <svg viewBox={logo.viewBox} width={width} height={height} role="img" aria-label="stamp2go – חותמות תוך 2 דקות" className={`block shrink-0 ${className}`}>
      {logo.paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

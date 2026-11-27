'use client';

import { useState } from 'react';

// Google's own avatar colours (the ones the home page's review cards used for the letter circle).
const AVATAR = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#12b5cb', '#c5221f', '#5f6368'];

/** A stable colour per name, so a reviewer keeps the same colour everywhere. */
function colourFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

/**
 * A reviewer's picture: their Google profile photo when there is one, otherwise (or when the photo
 * fails to load) a coloured circle with the first letter of their name. Decorative – the name is
 * always written next to it.
 */
export function ReviewAvatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        // An error that happened before hydration never reaches onError: check once on mount.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailed(true);
        }}
        className="shrink-0 rounded-full bg-surface object-cover"
        style={box}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{ ...box, background: colourFor(name), fontSize: Math.round(size * 0.425) }}
      aria-hidden
    >
      {name.replace(/[‎‏‪-‮]/g, '').trim().charAt(0).toUpperCase()}
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';

const HUES = ['#1a1e22', '#0b6bcb', '#b7791f', '#5f4b8b', '#3d2f6b', '#2f6b4b', '#6b2f3d'];

function monogramFor(hostname: string): { letters: string; hue: string } {
  const name = hostname.replace(/^www\./, '').split('.')[0] || hostname;
  let hash = 0;
  for (let i = 0; i < hostname.length; i += 1) {
    hash = (hash * 31 + hostname.charCodeAt(i)) >>> 0;
  }
  return { letters: name.slice(0, 2).toUpperCase(), hue: HUES[hash % HUES.length] };
}

interface VendorLogoProps {
  hostname: string;
  /** Rendered box size in px. */
  size?: number;
}

/**
 * A vendor's favicon, served through our own /api/vendor-logo proxy (so the
 * browser never hits a third-party icon CDN). Falls back to a colored monogram
 * while loading, when the site has no favicon, or on error.
 */
export function VendorLogo({ hostname, size = 28 }: VendorLogoProps) {
  const [failed, setFailed] = useState(false);
  // Reset when the host changes so a new vendor re-attempts its logo.
  useEffect(() => setFailed(false), [hostname]);

  const radius = Math.max(4, Math.round(size * 0.22));

  if (failed) {
    const { letters, hue } = monogramFor(hostname);
    return (
      <span
        aria-hidden
        className="grid flex-none place-items-center font-bold uppercase text-white"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: hue,
          fontSize: Math.round(size * 0.4),
        }}
      >
        {letters}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- proxied, dynamic host
    <img
      src={`/api/vendor-logo?host=${encodeURIComponent(hostname)}`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="flex-none object-contain"
      style={{ width: size, height: size, borderRadius: radius, background: 'var(--muted)' }}
    />
  );
}

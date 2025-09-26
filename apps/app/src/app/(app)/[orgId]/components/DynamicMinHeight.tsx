'use client';

import { cn } from '@comp/ui/cn';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DynamicMinHeightProps {
  children: React.ReactNode;
  className?: string;
}

export function DynamicMinHeight({ children, className }: DynamicMinHeightProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offsetPx, setOffsetPx] = useState<number>(0);

  useEffect(() => {
    const headerEl = document.querySelector('header.sticky') as HTMLElement | null;
    const bannerEl = document.getElementById('onboarding-banner') as HTMLElement | null;

    const compute = () => {
      const header = headerEl?.offsetHeight ?? 0;
      const banner = bannerEl?.offsetHeight ?? 0;
      // Add 1px border for each element like the server calculation did
      const extra = 0; // borders already included in offsetHeight
      setOffsetPx(header + banner + extra);
    };

    compute();

    const resizeObserver = new ResizeObserver(() => compute());
    if (headerEl) resizeObserver.observe(headerEl);
    if (bannerEl) resizeObserver.observe(bannerEl);

    const onResize = () => compute();
    window.addEventListener('resize', onResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const style = useMemo(() => ({ minHeight: `calc(100vh - ${offsetPx}px)` }), [offsetPx]);

  return (
    <div ref={containerRef} className={cn(className)} style={style}>
      {children}
    </div>
  );
}

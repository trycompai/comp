import { UserMenu } from '@/app/components/user-menu';
import NextLink from 'next/link';
import { Suspense } from 'react';

export async function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <NextLink href="/" className="text-sm font-semibold tracking-tight">
          Comp AI
        </NextLink>

        <Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

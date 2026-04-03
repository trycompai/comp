import { Skeleton } from '@trycompai/ui/skeleton';
import Link from 'next/link';
import { Suspense } from 'react';
import { UserMenu } from './user-menu';

export async function Header() {
  return (
    <header className="bg-card border-border/40 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
      <Link href="/frameworks" className="text-foreground hover:text-foreground/80 text-sm font-semibold tracking-tight">
        Framework Editor
      </Link>
      <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
        <UserMenu />
      </Suspense>
    </header>
  );
}

import { Skeleton } from '@comp/ui/skeleton';
import { Suspense } from 'react';
import { UserMenu } from './user-menu';

export async function Header() {
  return (
    <header className="bg-card border-border/40 static top-0 z-10 flex items-center justify-between border-b px-4 py-4">
      <div className="ml-auto flex space-x-2">
        <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

'use client';

import { Button } from '@comp/ui/button';
import { T } from 'gt-next';
import { useRouter } from 'next/navigation';

export function ErrorFallback() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <div>
        <T>
          <h2 className="text-md">Something went wrong</h2>
        </T>
      </div>
      <T>
        <Button onClick={() => router.refresh()} variant="outline">
          Try again
        </Button>
      </T>
    </div>
  );
}

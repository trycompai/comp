'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { T } from 'gt-next';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export function NoPolicies() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <FileText className="text-muted-foreground mb-4 h-12 w-12" />
        <T>
          <h3 className="mb-2 text-lg font-semibold">No policies yet</h3>
        </T>
        <T>
          <p className="text-muted-foreground mb-6">Get started by creating your first policy</p>
        </T>
        <Link href={`/${orgId}/policies/new`}>
          <T>
            <Button>Create first policy</Button>
          </T>
        </Link>
      </CardContent>
    </Card>
  );
}

export function NoResults({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <FileText className="text-muted-foreground mb-4 h-12 w-12" />
        <T>
          <h3 className="mb-2 text-lg font-semibold">No results found</h3>
        </T>
        <T>
          <p className="text-muted-foreground">Try another search, or adjusting the filters</p>
        </T>
      </CardContent>
    </Card>
  );
}

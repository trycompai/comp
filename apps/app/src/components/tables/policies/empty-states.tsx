'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export function NoPolicies() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <FileText className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">{'No policies yet'}</h3>
        <p className="text-muted-foreground mb-6">{'Get started by creating your first policy'}</p>
        <Link href={`/${orgId}/policies/new`}>
          <Button>{'Create first policy'}</Button>
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
        <h3 className="mb-2 text-lg font-semibold">{'No results found'}</h3>
        <p className="text-muted-foreground">{'Try another search, or adjusting the filters'}</p>
      </CardContent>
    </Card>
  );
}

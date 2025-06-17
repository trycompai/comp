import { CardContent, CardHeader, CardTitle } from '@comp/ui/card';

import { Card } from '@comp/ui/card';

export const SingleControlSkeleton = () => {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="bg-muted h-6 w-3/4 animate-pulse rounded-sm" />
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-16 animate-pulse rounded-sm" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Domain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded-sm" />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-muted/50 h-48 w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

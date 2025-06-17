import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Skeleton } from '@comp/ui/skeleton';

interface Props {
  amount: number;
  prefix?: string;
}

export const SkeletonLoader = ({ amount, prefix = 'item' }: Props) => {
  return (
    <div className="grid grid-cols-1 gap-8 py-8 md:grid-cols-2">
      {Array.from({ length: amount }, (_, i) => (
        <Card key={`${prefix}-skeleton-${i + 1}`}>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-full" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

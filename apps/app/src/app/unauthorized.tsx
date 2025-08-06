import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui/card';
import { T } from 'gt-next';
import Link from 'next/link';

export default async function UnauthorizedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Card className="w-full max-w-lg space-y-6 p-8">
        <div className="space-y-2 text-center">
          <T>
            <h1 className="text-2xl font-semibold tracking-tight">Unauthorized Access</h1>
          </T>
          <T>
            <p className="text-muted-foreground">
              You don't have permission to access this resource. Please contact your administrator
              if you believe this is a mistake.
            </p>
          </T>
        </div>

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/">
              <T>Return to Home</T>
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

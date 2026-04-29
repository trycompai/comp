import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trycompai/ui/card';
import type { Metadata } from 'next';

export default async function BillingPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Penetration Testing</CardTitle>
          <CardDescription>
            Every organization gets a free trial run. Paid plans are coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            See your remaining trial runs on the Penetration Tests page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Billing',
  };
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { Button, PageHeader, PageLayout } from '@trycompai/design-system';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface CheckoutPageProps {
  params: Promise<{
    orgId: string;
  }>;
  searchParams: Promise<{
    reportId?: string;
  }>;
}

export default async function PenetrationTestCheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { orgId } = await params;
  const { reportId } = await searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/');
  }

  if (!reportId) {
    redirect(`/${orgId}/security/penetration-tests`);
  }

  const successUrl = `/${orgId}/security/penetration-tests?checkout=success&reportId=${encodeURIComponent(reportId)}`;

  return (
    <PageLayout>
      <PageHeader title="Mock Checkout">Continue to one-time penetration test checkout for this report instance.</PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Penetration test checkout</CardTitle>
          <CardDescription>
            This is a mocked one-time checkout flow. In production this page will be replaced by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Click below to complete checkout and return to your report queue.
          </p>
          <form action={successUrl}>
            <Button type="submit">
              Complete Purchase <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Mock Penetration Test Checkout',
  };
}

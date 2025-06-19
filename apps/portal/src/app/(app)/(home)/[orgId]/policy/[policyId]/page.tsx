import { auth } from '@/app/lib/auth';
import { db } from '@comp/db';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PolicyAcceptButton } from './PolicyAcceptButton';
import PolicyViewer from './PolicyViewer';

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policyId: string; orgId: string }>;
}) {
  const { policyId, orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  const policy = await db.policy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    redirect(`/${orgId}`);
  }

  // Get the member info for the current org
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
    },
  });

  if (!member) {
    redirect('/');
  }

  const isAccepted = policy.signedBy.includes(member.id);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <Link href={`/${orgId}`} className="mb-4 inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
      </div>

      <Card className="shadow-md">
        {isAccepted && (
          <div className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 mb-4 flex items-center gap-2 rounded-t-xs border p-3">
            <Check className="text-green-600 dark:text-green-400 h-5 w-5" />
            <span className="text-green-800 dark:text-green-300 text-sm font-medium">
              You have accepted this policy
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{policy.name}</CardTitle>
          {policy.description && (
            <CardDescription className="text-muted-foreground">
              {policy.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <PolicyViewer content={policy.content} />
          </div>
          {policy.updatedAt && (
            <p className="text-muted-foreground mt-6 text-sm">
              Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <PolicyAcceptButton
            policyId={policy.id}
            memberId={member.id}
            isAccepted={isAccepted}
            orgId={orgId}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

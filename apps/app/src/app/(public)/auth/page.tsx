import { LoginForm } from '@/components/login-form';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Icons } from '@comp/ui/icons';
import { T } from 'gt-next';
import { getGT } from 'gt-next/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();

  return {
    title: t('Login | Comp AI'),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ inviteCode?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { inviteCode } = await searchParams;

  const orgId = session?.session?.activeOrganizationId;

  if (orgId && inviteCode) {
    redirect('/setup');
  }

  if (orgId && !inviteCode) {
    redirect('/');
  }

  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const showGithub = !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-3 pt-10">
            <Icons.Logo className="h-10 w-10 mx-auto" />
            <T>
              <CardTitle className="text-2xl tracking-tight text-card-foreground">
                Get Started with Comp AI
              </CardTitle>
            </T>
            <T>
              <CardDescription className="text-base text-muted-foreground px-4">
                {`Automate SOC 2, ISO 27001 and GDPR compliance with AI.`}
              </CardDescription>
            </T>
          </CardHeader>
          <CardContent className="space-y-6 pb-6 px-8">
            <LoginForm inviteCode={inviteCode} showGoogle={showGoogle} showGithub={showGithub} />
          </CardContent>
          <CardFooter className="pb-10">
            <T>
              <p className="w-full px-6 text-center text-xs text-muted-foreground">
                By clicking continue, you acknowledge that you have read and agree to the{' '}
                <Link
                  href="https://trycomp.ai/terms-and-conditions"
                  className="underline hover:text-primary"
                >
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link
                  href="https://trycomp.ai/privacy-policy"
                  className="underline hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </T>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

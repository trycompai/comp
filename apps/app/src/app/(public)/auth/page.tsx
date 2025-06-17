import { GithubSignIn } from '@/components/github-sign-in';
import { GoogleSignIn } from '@/components/google-sign-in';
import { MagicLinkSignIn } from '@/components/magic-link';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Icons } from '@comp/ui/icons';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Balancer from 'react-wrap-balancer';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ inviteCode?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { inviteCode } = await searchParams;

  let preferredSignInOption: React.ReactNode;

  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    preferredSignInOption = (
      <div className="flex flex-col space-y-2">
        <GoogleSignIn inviteCode={inviteCode} />
      </div>
    );
  } else {
    preferredSignInOption = (
      <div className="flex flex-col space-y-2">
        <MagicLinkSignIn inviteCode={inviteCode} />
      </div>
    );
  }

  let moreSignInOptions: React.ReactNode;

  if (
    env.AUTH_GOOGLE_ID &&
    env.AUTH_GOOGLE_SECRET &&
    env.AUTH_GITHUB_ID &&
    env.AUTH_GITHUB_SECRET
  ) {
    moreSignInOptions = (
      <div className="flex flex-col space-y-2">
        <MagicLinkSignIn inviteCode={inviteCode} />
        <GithubSignIn inviteCode={inviteCode} />
      </div>
    );
  } else {
    moreSignInOptions = null;
  }

  const orgId = session?.session?.activeOrganizationId;

  if (orgId && inviteCode) {
    redirect('/setup');
  }

  if (orgId && !inviteCode) {
    redirect('/');
  }

  return (
    <div>
      <header className="fixed right-0 left-0 w-full">
        <div className="mt-4 ml-5 md:mt-10 md:ml-10">
          <Link href="/">
            <Icons.Logo />
          </Link>
        </div>
      </header>

      <div className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-0">
        <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
          <div className="relative flex w-full flex-col">
            <Balancer>
              <h1 className="pb-1 text-3xl font-medium">Get Started with Comp AI</h1>
              <h2 className="pb-1 text-xl font-medium">
                {'Automate SOC 2, ISO 27001 and GDPR compliance with AI.'}
              </h2>
            </Balancer>

            <div className="pointer-events-auto mt-6 mb-6 flex flex-col">
              {preferredSignInOption}

              <Accordion type="single" collapsible className="mt-6 border-t-[1px] pt-2">
                {moreSignInOptions && (
                  <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="flex justify-center space-x-2 text-sm">
                      <span>More options</span>
                    </AccordionTrigger>
                    <AccordionContent className="mt-4">
                      <div className="flex flex-col space-y-4">{moreSignInOptions}</div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            <p className="text-muted-foreground text-xs">
              By clicking continue, you acknowledge that you have read and agree to the{' '}
              <a href="https://trycomp.ai/terms-and-conditions" className="underline">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="https://trycomp.ai/privacy-policy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

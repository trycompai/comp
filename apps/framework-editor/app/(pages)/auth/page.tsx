import { auth } from '@/app/lib/auth';
import { isInternalUser } from '@/app/lib/utils';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Balancer from 'react-wrap-balancer';
import { GoogleSignIn } from './google-sign-in';
import { Unauthorized } from './Unauthorized';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const hasSession = !!session?.user;
  const isAllowed =
    hasSession &&
    session.user.role === 'admin' &&
    isInternalUser(session.user.email);

  if (hasSession && !isAllowed) {
    return <Unauthorized />;
  }

  if (hasSession && isAllowed) {
    redirect('/frameworks');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-hidden p-6 md:p-0">
      <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
        <div className="relative flex w-full flex-col">
          <Balancer>
            <h1 className="pb-1 text-3xl font-medium">Get Started with Comp AI</h1>
            <h2 className="pb-1 text-xl font-medium">Sign in to continue</h2>
          </Balancer>

          <div className="pointer-events-auto mt-6 mb-6 flex flex-col">
            <GoogleSignIn />
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
  );
}

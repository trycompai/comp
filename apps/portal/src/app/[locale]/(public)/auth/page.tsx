import { OtpSignIn } from '@/app/components/otp';
import { getI18n } from '@/app/locales/server';
import { Button } from '@comp/ui/button';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page() {
  const t = await getI18n();

  const defaultSignInOptions = (
    <div className="flex flex-col space-y-2">
      <OtpSignIn />
    </div>
  );

  return (
    <>
      <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center overflow-hidden p-6 md:p-0">
        <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
          <div className="relative flex w-full flex-col">
            <div className="from-primary inline-block bg-clip-text pb-4">
              <div className="flex flex-row items-center gap-2">
                <Link href="/" className="flex flex-row items-center gap-2">
                  <h1 className="font-mono text-xl font-semibold">Comp AI</h1>
                </Link>
              </div>
              <h2 className="mt-4 text-lg font-medium">{t('auth.title')}</h2>
              <div className="mt-2">
                <span className="text-muted-foreground text-xs">{t('auth.description')}</span>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-col">{defaultSignInOptions}</div>
          </div>

          <div className="from-primary/10 via-primary/5 to-primary/5 mt-8 rounded-sm bg-gradient-to-r p-4">
            <h3 className="text-sm font-medium">{t('powered_by.title')}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{t('powered_by.description')}</p>
            <Button variant="link" className="mt-2 p-0" asChild>
              <Link
                href="https://trycomp.ai"
                target="_blank"
                className="hover:underline hover:underline-offset-2"
              >
                <span className="text-primary mt-2 inline-flex items-center gap-2 text-xs font-medium">
                  {t('powered_by.learn_more')}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

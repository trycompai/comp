import { LoginForm } from '@/app/components/login-form';
import { OtpSignIn } from '@/app/components/otp';
import { env } from '@/env.mjs';
import { buttonVariants, Card, CardContent, CardHeader } from '@trycompai/ui-shadcn';
import { cn } from '@trycompai/ui-shadcn/cn';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page() {
  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const showMicrosoft = !!(env.AUTH_MICROSOFT_CLIENT_ID && env.AUTH_MICROSOFT_CLIENT_SECRET);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="text-sm font-semibold tracking-tight">Comp AI</div>
                <h1 className="text-xl font-semibold">Employee Portal</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email address to receive <br /> a one time password
                </p>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <OtpSignIn />
                </div>

                <LoginForm showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">
                      Comp AI — AI that handles compliance for you in hours.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless. Eliminate
                      compliance busywork, win more deals and accelerate growth.
                    </p>
                    <Link
                      href="https://trycomp.ai"
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      <span className="inline-flex items-center gap-2">
                        Learn More
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

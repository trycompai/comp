import { LoginForm } from '@/app/components/login-form';
import { OtpSignIn } from '@/app/components/otp';
import { env } from '@/env.mjs';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Icons } from '@comp/ui/icons';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page() {
  const defaultSignInOptions = (
    <div className="flex flex-col space-y-2">
      <OtpSignIn />
    </div>
  );

  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const showMicrosoft = !!(env.AUTH_MICROSOFT_CLIENT_ID && env.AUTH_MICROSOFT_CLIENT_SECRET);

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-3 pt-10">
            <Icons.Logo className="h-10 w-10 mx-auto" />
            <CardTitle className="text-2xl tracking-tight text-card-foreground">
              Employee Portal
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground px-4">
              Enter your email address to receive a one time password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-6">
            {defaultSignInOptions}
            <LoginForm showGoogle={showGoogle} showMicrosoft={showMicrosoft} />
          </CardContent>
          <CardFooter className="pb-10">
            <div className="from-primary/10 via-primary/5 to-primary/5 rounded-sm bg-gradient-to-r p-4">
              <h3 className="text-sm font-medium">
                Comp AI - AI that handles compliance for you in hours.
              </h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless. Eliminate compliance
                busywork, win more deals and accelerate growth.
              </p>
              <Button variant="link" className="mt-2 p-0" asChild>
                <Link
                  href="https://trycomp.ai"
                  target="_blank"
                  className="hover:underline hover:underline-offset-2"
                >
                  <span className="text-primary mt-2 inline-flex items-center gap-2 text-xs font-medium">
                    Learn More
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

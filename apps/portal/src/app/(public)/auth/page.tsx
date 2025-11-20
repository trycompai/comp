import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/app/components/login-form";
import { OtpSignIn } from "@/app/components/otp";
import { env } from "@/env.mjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@trycompai/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@trycompai/ui/card";
import { Icons } from "@trycompai/ui/icons";

export const metadata: Metadata = {
  title: "Login | Comp AI",
};

export default async function Page() {
  const defaultSignInOptions = (
    <div className="flex flex-col space-y-2">
      <OtpSignIn />
    </div>
  );

  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

  return (
    <div className="text-foreground flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 pt-10 text-center">
            <Icons.Logo className="mx-auto h-10 w-10" />
            <CardTitle className="text-card-foreground text-2xl tracking-tight">
              Employee Portal
            </CardTitle>
            <CardDescription className="text-muted-foreground px-4 text-base">
              Enter your email address to receive a one time password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-6">
            {defaultSignInOptions}
            <LoginForm showGoogle={showGoogle} />
          </CardContent>
          <CardFooter className="pb-10">
            <div className="from-primary/10 via-primary/5 to-primary/5 rounded-sm bg-gradient-to-r p-4">
              <h3 className="text-sm font-medium">
                Comp AI - AI that handles compliance for you in hours.
              </h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless.
                Eliminate compliance busywork, win more deals and accelerate
                growth.
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

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { env } from "@/env.mjs";
import { auth } from "@/utils/auth";

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
    redirect("/setup");
  }

  if (orgId && !inviteCode) {
    redirect("/");
  }

  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const showGithub = !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

  return (
    <div className="text-foreground flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 pt-10 text-center">
            <Icons.Logo className="mx-auto h-10 w-10" />
            <CardTitle className="text-card-foreground text-2xl tracking-tight">
              Get Started with Comp AI
            </CardTitle>
            <CardDescription className="text-muted-foreground px-4 text-base">
              {`Automate SOC 2, ISO 27001 and GDPR compliance with AI.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-6">
            <LoginForm
              inviteCode={inviteCode}
              showGoogle={showGoogle}
              showGithub={showGithub}
            />
          </CardContent>
          <CardFooter className="pb-10">
            <p className="text-muted-foreground w-full px-6 text-center text-xs">
              By clicking continue, you acknowledge that you have read and agree
              to the{" "}
              <Link
                href="https://trycomp.ai/terms-and-conditions"
                className="hover:text-primary underline"
              >
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="https://trycomp.ai/privacy-policy"
                className="hover:text-primary underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

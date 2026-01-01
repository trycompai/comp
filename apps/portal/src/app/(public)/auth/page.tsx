import { LoginForm } from '@/app/components/login-form';
import { OtpSignIn } from '@/app/components/otp';
import { env } from '@/env.mjs';
import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  cn,
  Heading,
  PageLayout,
  Stack,
  Text,
} from '@trycompai/ui-shadcn';
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
    <PageLayout variant="center">
      <Card maxWidth="lg">
        <CardHeader>
          <Stack align="center" gap="3" className="text-center">
            <Text size="sm" weight="semibold" className="tracking-tight">
              Comp AI
            </Text>
            <Heading level="1">Employee Portal</Heading>
            <Text size="base" variant="muted">
              Enter your email address to receive a one time password
            </Text>
          </Stack>
        </CardHeader>

        <CardContent>
          <Stack gap="6">
            <Stack gap="2">
              <OtpSignIn />
            </Stack>

            <LoginForm showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

            <div className="rounded-lg bg-muted p-4">
              <Stack gap="3">
                <Text size="sm" weight="medium">
                  Comp AI — AI that handles compliance for you in hours.
                </Text>
                <Text size="xs" variant="muted">
                  Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless. Eliminate compliance
                  busywork, win more deals and accelerate growth.
                </Text>
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
              </Stack>
            </div>
          </Stack>
        </CardContent>
      </Card>
    </PageLayout>
  );
}

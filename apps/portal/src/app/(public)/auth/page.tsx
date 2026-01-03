import { LoginForm } from '@/app/components/login-form';
import { OtpSignIn } from '@/app/components/otp';
import { env } from '@/env.mjs';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
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
    <PageLayout variant="center" contentWidth="xl">
      <Card width="full">
        <CardHeader>
          <Stack align="center" gap="2.5" textAlign="center">
            <Text size="sm" weight="semibold">
              Comp AI
            </Text>
            <Heading level="1">Employee Portal</Heading>
            <Text size="base" variant="muted">
              Enter your email address to receive a one time password
            </Text>
          </Stack>
        </CardHeader>

        <CardContent>
          <Stack gap="5">
            <Stack gap="2">
              <OtpSignIn />
            </Stack>

            <LoginForm showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

            <Card size="sm" width="full">
              <CardContent>
                <Stack gap="3">
                  <Text size="sm" weight="medium">
                    Comp AI — AI that handles compliance for you in hours.
                  </Text>
                  <Text size="xs" variant="muted">
                    Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless. Eliminate compliance
                    busywork, win more deals and accelerate growth.
                  </Text>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconRight={<ArrowRight />}
                      render={<Link href="https://trycomp.ai" target="_blank" rel="noreferrer" />}
                    >
                      Learn More
                    </Button>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </CardContent>
      </Card>
    </PageLayout>
  );
}

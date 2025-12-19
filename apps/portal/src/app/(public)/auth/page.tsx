import { LoginForm } from '@/app/components/login-form';
import { OtpSignIn } from '@/app/components/otp';
import { env } from '@/env.mjs';
import { Icons } from '@comp/ui/icons';
import { Box, Button, Card, Container, Flex, Heading, Text, VStack } from '@trycompai/ui-v2';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login | Comp AI',
};

export default async function Page() {
  const defaultSignInOptions = (
    <VStack align="stretch" gap="2">
      <OtpSignIn />
    </VStack>
  );

  const showGoogle = !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const showMicrosoft = !!(env.AUTH_MICROSOFT_CLIENT_ID && env.AUTH_MICROSOFT_CLIENT_SECRET);

  return (
    <div className="chakra-scope">
      <Box minH="dvh" bg="bg" color="fg">
        <Flex minH="dvh" align="center" justify="center">
          <Container maxW="lg" w="full">
            <Card.Root>
              <Card.Header textAlign="center">
                <VStack gap="3">
                  <Box display="flex" justifyContent="center">
                    <Icons.Logo width={40} height={40} />
                  </Box>
                  <Heading size="xl">Employee Portal</Heading>
                  <Text color="fg.muted">
                    Enter your email address to receive <br /> a one time password
                  </Text>
                </VStack>
              </Card.Header>

              <Card.Body>
                <VStack align="stretch" gap="6">
                  {defaultSignInOptions}
                  <LoginForm showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

                  <Box bg="primary.subtle" borderRadius="card" p="4">
                    <VStack align="start" gap="3">
                      <Text fontSize="sm" fontWeight="medium">
                        Comp AI — AI that handles compliance for you in hours.
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Comp AI makes SOC 2, ISO 27001, HIPAA and GDPR effortless. Eliminate
                        compliance busywork, win more deals and accelerate growth.
                      </Text>
                      <Button asChild variant="outline" colorPalette="primary" size="sm">
                        <Link href="https://trycomp.ai" target="_blank">
                          <Box as="span" display="inline-flex" alignItems="center" gap="2">
                            Learn More
                            <ArrowRight className="h-3 w-3" />
                          </Box>
                        </Link>
                      </Button>
                    </VStack>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Container>
        </Flex>
      </Box>
    </div>
  );
}

'use client';

import { HStack, Separator, Text, VStack } from '@trycompai/ui-v2';
import { useSearchParams } from 'next/navigation';
import { GoogleSignIn } from './google-sign-in';
import { MicrosoftSignIn } from './microsoft-sign-in';

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
  showMicrosoft: boolean;
}

export function LoginForm({ inviteCode, showGoogle, showMicrosoft }: LoginFormProps) {
  const searchParams = useSearchParams();

  if (!showGoogle && !showMicrosoft) {
    return null;
  }

  return (
    <VStack align="stretch" gap="4">
      <HStack gap="3" align="center">
        <Separator flex="1" />
        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
          OR
        </Text>
        <Separator flex="1" />
      </HStack>

      <VStack align="stretch" gap="4">
        {showGoogle ? (
          <GoogleSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />
        ) : null}
        {showMicrosoft ? (
          <MicrosoftSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />
        ) : null}
      </VStack>
    </VStack>
  );
}

'use client';

import { authClient } from '@/app/lib/auth-client';
import { Icons } from '@comp/ui/icons';
import { Button, HStack, Text } from '@trycompai/ui-v2';
import { useState } from 'react';

export function GoogleSignIn({
  inviteCode,
  searchParams,
}: {
  inviteCode?: string;
  searchParams?: URLSearchParams;
}) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    // Build the callback URL with search params
    const baseURL = window.location.origin;
    const path = inviteCode ? `/invite/${inviteCode}` : '/';
    const redirectTo = new URL(path, baseURL);

    // Append all search params if they exist
    if (searchParams) {
      searchParams.forEach((value, key) => {
        redirectTo.searchParams.append(key, value);
      });
    }

    await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectTo.toString(),
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      colorPalette="secondary"
      w="full"
      size="lg"
      disabled={isLoading}
      loading={isLoading}
    >
      <HStack gap="2">
        <Icons.Google width={16} height={16} />
        <Text as="span">Continue with Google</Text>
      </HStack>
    </Button>
  );
}

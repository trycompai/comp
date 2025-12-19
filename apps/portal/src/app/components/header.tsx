import { UserMenu } from '@/app/components/user-menu';
import { Icons } from '@comp/ui/icons';
import { Box, HStack, Link, Skeleton } from '@trycompai/ui-v2';
import NextLink from 'next/link';
import { Suspense } from 'react';

export async function Header() {
  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="10"
      borderBottomWidth="1px"
      borderColor="border"
      bg={{ base: 'bg', md: 'transparent' }}
      backdropFilter={{ base: 'blur(12px)', md: 'none' }}
      pt="4"
      pb={{ base: '2', md: '4' }}
    >
      <HStack justify="space-between" gap="3">
        <Link asChild>
          <NextLink href="/">
            <Icons.Logo />
          </NextLink>
        </Link>

        <Suspense fallback={<Skeleton boxSize="8" borderRadius="full" />}>
          <UserMenu />
        </Suspense>
      </HStack>
    </Box>
  );
}

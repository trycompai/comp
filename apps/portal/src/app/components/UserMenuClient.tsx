'use client';

import { Avatar, Box, chakra, HStack, Menu, Portal, Text, VStack } from '@trycompai/ui-v2';

import { Logout } from './logout';
import { ThemeSwitch } from './theme-switch';

interface UserMenuClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  userInitials: string;
}

export function UserMenuClient({ user, userInitials }: UserMenuClientProps) {
  const TriggerButton = chakra('button');

  return (
    <Menu.Root positioning={{ placement: 'bottom-end', gutter: 10 }}>
      <Menu.Trigger asChild>
        <TriggerButton
          type="button"
          display="inline-flex"
          p="0"
          borderRadius="full"
          bg="transparent"
          borderWidth="0"
          aria-label="Open user menu"
        >
          <Avatar.Root boxSize="8">
            {user?.image ? (
              <Avatar.Image src={user.image} alt={user.name ?? 'User avatar'} />
            ) : null}
            <Avatar.Fallback name={user?.name ?? undefined}>
              <Text fontSize="xs" fontWeight="semibold">
                {userInitials}
              </Text>
            </Avatar.Fallback>
          </Avatar.Root>
        </TriggerButton>
      </Menu.Trigger>

      {/* Disable portal so positioning is anchored to the trigger (fixes "menu opens elsewhere"). */}
      <Portal>
        <Menu.Positioner>
          <Menu.Content p="0" overflow="visible">
            <Box px="3" py="2.5">
              <HStack justify="space-between" gap="3" align="start">
                <VStack align="start" gap="0" minW="0">
                  <Text fontSize="sm" fontWeight="medium" lineClamp={1} maxW="155px">
                    {user?.name}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" lineClamp={1} maxW="155px">
                    {user?.email}
                  </Text>
                </VStack>
              </HStack>
            </Box>

            <Menu.Separator />

            <Box px="3" py="2">
              <Text fontSize="xs" color="fg.muted" mb="2">
                Theme
              </Text>
              <ThemeSwitch />
            </Box>

            <Menu.Separator />

            <Logout />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

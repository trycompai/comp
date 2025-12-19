'use client';

import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Box, Button, HStack, Popover, Portal, Text, VStack } from '@trycompai/ui-v2';

type Theme = 'dark' | 'system' | 'light';

const ThemeIcon = ({ theme }: { theme: Theme }) => {
  switch (theme) {
    case 'dark':
      return <Moon size={12} />;
    case 'system':
      return <Monitor size={12} />;
    case 'light':
    default:
      return <Sun size={12} />;
  }
};

export const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? 'system') as Theme;

  const currentLabel = current === 'system' ? 'System' : current === 'dark' ? 'Dark' : 'Light';

  return (
    <Popover.Root
      positioning={{ placement: 'bottom-start', gutter: 8, sameWidth: true, flip: false }}
    >
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline" w="140px" display="flex" justifyContent="space-between">
          <HStack gap="2">
            <ThemeIcon theme={current} />
            <Text fontSize="sm">{currentLabel}</Text>
          </HStack>
          <ChevronDown size={14} />
        </Button>
      </Popover.Trigger>

      <Portal disabled>
        <Popover.Positioner>
          <Popover.Content w="140px" p="1">
            <VStack align="stretch" gap="1">
              {(
                [
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ] as const
              ).map((item) => {
                const isActive = current === item.value;
                return (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => setTheme(item.value)}
                  >
                    <HStack gap="2" w="full" justify="space-between">
                      <HStack gap="2">
                        <ThemeIcon theme={item.value} />
                        <Text fontSize="sm">{item.label}</Text>
                      </HStack>
                      {isActive ? <Box boxSize="2" borderRadius="full" bg="primary.solid" /> : null}
                    </HStack>
                  </Button>
                );
              })}
            </VStack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

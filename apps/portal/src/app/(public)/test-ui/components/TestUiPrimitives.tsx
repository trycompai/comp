'use client';

import { Box, Flex, Heading, HStack, Text } from '@trycompai/ui-new';
import type { ReactNode } from 'react';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box mb={12}>
      <Heading size="lg" mb={6} pb={2} borderBottom="1px solid" borderColor="border">
        {title}
      </Heading>
      {children}
    </Box>
  );
}

export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box mb={4}>
      <Text fontWeight="semibold" mb={2}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

const DEFAULT_SHADES = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

export function ColorRow({
  name,
  description,
  shades = DEFAULT_SHADES,
}: {
  name: string;
  description: string;
  shades?: readonly string[];
}) {
  return (
    <Box w="full">
      <HStack>
        <Text fontWeight="semibold" fontSize="sm">
          {name}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {description}
        </Text>
      </HStack>
      {/* Add top padding (lg+) so shade labels above swatches don't overlap the header */}
      <Flex gap={1} mt={2} pt={{ base: 0, lg: 6 }}>
        {shades.map((shade) => (
          <Box
            key={shade}
            bg={`${name}.${shade}`}
            h={16}
            flex={1}
            borderRadius="sm"
            title={`${name}.${shade}`}
            position="relative"
          >
            <Text
              position="absolute"
              bottom="calc(100% + 2px)"
              left="50%"
              transform="translateX(-50%)"
              fontSize="xs"
              color="gray.500"
              display={{ base: 'none', lg: 'block' }}
            >
              {shade}
            </Text>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}

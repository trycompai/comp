'use client';

import {
  Button,
  HStack,
  SUPPORTED_COLOR_PALETTES,
  type SupportedColorPalette,
  Text,
} from '@trycompai/ui-new';

export type ButtonColorPalette = SupportedColorPalette;

export function ButtonPaletteSwitcher({
  value,
  onChange,
}: {
  value: ButtonColorPalette;
  onChange: (value: ButtonColorPalette) => void;
}) {
  return (
    <HStack gap={3} align="center" flexWrap="wrap">
      <Text color="fg" fontSize="sm" fontWeight="medium">
        Palette
      </Text>
      <HStack
        gap="2"
        flexWrap="wrap"
        bg="bg"
        borderWidth="1px"
        borderColor="border"
        borderRadius="lg"
        p="1"
        boxShadow="xs"
        role="group"
        aria-label="Button palette"
      >
        {SUPPORTED_COLOR_PALETTES.map((palette) => {
          const isSelected = palette === value;

          return (
            <Button
              key={palette}
              size="sm"
              variant={isSelected ? 'solid' : 'outline'}
              colorPalette={palette}
              onClick={() => onChange(palette)}
              aria-pressed={isSelected}
            >
              <HStack gap="2">
                <Text as="span" textTransform="capitalize">
                  {palette}
                </Text>
              </HStack>
            </Button>
          );
        })}
      </HStack>
    </HStack>
  );
}

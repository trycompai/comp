'use client';

import {
  Avatar,
  AvatarGroup,
  Box,
  type Color,
  ColorPicker,
  ColorSwatch,
  createIcon,
  Grid,
  Heading,
  HStack,
  Icon,
  Image,
  parseColor,
  Text,
  VStack,
} from '@trycompai/ui-v2';
import { useMemo, useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

const CompLogoIcon = createIcon({
  displayName: 'CompLogoIcon',
  viewBox: '0 0 24 24',
  path: (
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm3.6 12.6a5.1 5.1 0 1 1 0-5.2h-2.5a2.9 2.9 0 1 0 0 2.9Z"
    />
  ),
});

export function TestUiSectionsMedia() {
  const [color, setColor] = useState<Color>(() => parseColor('#007A55'));

  const swatches = useMemo(() => {
    const values = [
      '#007A55',
      '#20808D',
      '#A84B2F',
      '#944454',
      '#FFD2A6',
      '#E4E3D4',
      '#16171B',
    ] as const;
    return values.map((value) => ({ value, color: parseColor(value) }));
  }, []);

  return (
    <Section title="Media & Visuals">
      <VStack align="stretch" gap={8}>
        <SubSection title="Avatar">
          <HStack gap={4} flexWrap="wrap">
            <Avatar.Root>
              <Avatar.Fallback name="Comp AI" />
            </Avatar.Root>
            <Avatar.Root>
              <Avatar.Image src="https://placehold.co/64x64.png" alt="placeholder avatar" />
              <Avatar.Fallback name="Comp AI" />
            </Avatar.Root>
            <AvatarGroup>
              <Avatar.Root>
                <Avatar.Fallback name="Ada Lovelace" />
              </Avatar.Root>
              <Avatar.Root>
                <Avatar.Fallback name="Grace Hopper" />
              </Avatar.Root>
              <Avatar.Root>
                <Avatar.Fallback name="Alan Turing" />
              </Avatar.Root>
            </AvatarGroup>
          </HStack>
        </SubSection>

        <SubSection title="Icon / createIcon">
          <HStack gap={3} align="center">
            <Icon as={CompLogoIcon} boxSize="6" color="primary.fg" />
            <Heading size="sm">Custom icon via createIcon</Heading>
          </HStack>
          <Text fontSize="sm" color="fg.muted" mt="2">
            Icons should inherit color via `currentColor`.
          </Text>
        </SubSection>

        <SubSection title="Image">
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Box borderWidth="1px" borderColor="border" borderRadius="card" overflow="hidden">
              <Image
                src="https://placehold.co/800x450.png"
                alt="placeholder 16:9 image"
                width="100%"
                height="auto"
              />
            </Box>
            <Box borderWidth="1px" borderColor="border" borderRadius="card" overflow="hidden">
              <Image
                src="https://placehold.co/800x450.png?text=Hover+me"
                alt="placeholder hover image"
                width="100%"
                height="auto"
                _hover={{ opacity: 0.9 }}
              />
            </Box>
          </Grid>
        </SubSection>

        <SubSection title="ColorSwatch">
          <HStack gap={3} flexWrap="wrap" align="center">
            {swatches.map(({ value }) => (
              <HStack key={value} gap="2">
                <ColorSwatch value={value} />
                <Text fontSize="sm" color="fg.muted">
                  {value}
                </Text>
              </HStack>
            ))}
          </HStack>
        </SubSection>

        <SubSection title="ColorPicker">
          <Text fontSize="sm" color="fg.muted" mb="3">
            This is interactive; use it to verify tokens (panel/bg/border) and focus/hover styling.
          </Text>
          <ColorPicker.Root
            value={color}
            onValueChange={(e) => setColor(e.value)}
            colorPalette="primary"
          >
            <ColorPicker.Label>Pick a color</ColorPicker.Label>
            <ColorPicker.Control>
              <ColorPicker.Input />
              <ColorPicker.Trigger>
                <ColorPicker.ValueSwatch />
                <ColorPicker.ValueText />
              </ColorPicker.Trigger>
            </ColorPicker.Control>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                <ColorPicker.Area>
                  <ColorPicker.AreaBackground />
                  <ColorPicker.AreaThumb />
                </ColorPicker.Area>
                <ColorPicker.Sliders />
                <ColorPicker.SwatchGroup>
                  {swatches.map(({ value, color }) => (
                    <ColorPicker.SwatchTrigger key={value} value={color}>
                      <ColorPicker.Swatch value={color} />
                    </ColorPicker.SwatchTrigger>
                  ))}
                </ColorPicker.SwatchGroup>
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </ColorPicker.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}

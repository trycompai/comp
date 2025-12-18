'use client';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Grid,
  HStack,
  Input,
  Progress,
  Skeleton,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@trycompai/ui-new';
import { useState } from 'react';
import { ButtonPaletteSwitcher, type ButtonColorPalette } from './ButtonPaletteSwitcher';
import { ColorRow, Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsTop() {
  const [buttonPalette, setButtonPalette] = useState<ButtonColorPalette>('primary');

  return (
    <>
      <Section title="Color Tokens">
        <VStack align="start" gap={8}>
          <ColorRow name="primary" />
          <ColorRow name="secondary" />
          <ColorRow name="blue" />
          <ColorRow name="orange" />
          <ColorRow name="rose" />
          <ColorRow name="yellow" />
          <ColorRow name="sand" />
        </VStack>
      </Section>

      <Section title="Buttons">
        <HStack mb={3}>
          <ButtonPaletteSwitcher value={buttonPalette} onChange={setButtonPalette} />
        </HStack>
        <SubSection title="Variants">
          <HStack gap={4} flexWrap="wrap">
            <Button colorPalette={buttonPalette}>Default Button</Button>
            <Button colorPalette={buttonPalette} variant="outline">
              Outline
            </Button>
            <Button colorPalette={buttonPalette} variant="ghost">
              Ghost
            </Button>
            <Button colorPalette={buttonPalette} variant="link">
              Link
            </Button>
          </HStack>
        </SubSection>

        <SubSection title="Sizes">
          <HStack gap={4} alignItems="center" flexWrap="wrap">
            <Button colorPalette={buttonPalette} size="xs">
              XS
            </Button>
            <Button colorPalette={buttonPalette} size="sm">
              SM
            </Button>
            <Button colorPalette={buttonPalette} size="md">
              MD
            </Button>
            <Button colorPalette={buttonPalette} size="lg">
              LG
            </Button>
            <Button colorPalette={buttonPalette} size="xl">
              XL
            </Button>
          </HStack>
        </SubSection>

        <SubSection title="States">
          <HStack gap={4} flexWrap="wrap">
            <Button colorPalette={buttonPalette}>Normal</Button>
            <Button colorPalette={buttonPalette} disabled>
              Disabled
            </Button>
            <Button colorPalette={buttonPalette} loading>
              Loading
            </Button>
          </HStack>
        </SubSection>
      </Section>

      <Section title="Badges">
        <SubSection title="Color Palettes">
          <HStack gap={4} flexWrap="wrap">
            <Badge colorPalette="primary">Primary</Badge>
            <Badge colorPalette="secondary">Secondary</Badge>
            <Badge colorPalette="blue">Blue</Badge>
            <Badge colorPalette="orange">Orange</Badge>
            <Badge colorPalette="rose">Rose</Badge>
            <Badge colorPalette="yellow">Yellow</Badge>
            <Badge colorPalette="sand">Sand</Badge>
          </HStack>
        </SubSection>

        <SubSection title="Variants">
          <HStack gap={4} flexWrap="wrap">
            <Badge variant="solid">Solid</Badge>
            <Badge variant="subtle">Subtle</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="surface">Surface</Badge>
          </HStack>
        </SubSection>
      </Section>

      <Section title="Form Controls">
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          <VStack align="stretch" gap={4}>
            <SubSection title="Input">
              <VStack align="stretch" gap={2}>
                <Input placeholder="Default input" />
                <Input placeholder="With border color" borderColor="secondary.300" />
                <Input placeholder="Disabled" disabled />
              </VStack>
            </SubSection>

            <SubSection title="Textarea">
              <Textarea placeholder="Enter description..." rows={3} />
            </SubSection>
          </VStack>

          <VStack align="stretch" gap={4}>
            <SubSection title="Checkbox">
              <VStack align="start" gap={2}>
                <Checkbox.Root defaultChecked colorPalette="primary">
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Checked (primary)</Checkbox.Label>
                </Checkbox.Root>
                <Checkbox.Root colorPalette="secondary">
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Unchecked (secondary)</Checkbox.Label>
                </Checkbox.Root>
              </VStack>
            </SubSection>

            <SubSection title="Switch">
              <VStack align="start" gap={2}>
                <Switch.Root defaultChecked colorPalette="primary">
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>Enabled</Switch.Label>
                </Switch.Root>
                <Switch.Root colorPalette="secondary">
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>Secondary color</Switch.Label>
                </Switch.Root>
              </VStack>
            </SubSection>
          </VStack>
        </Grid>
      </Section>

      <Section title="Cards">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
          <Card.Root>
            <Card.Header>
              <Card.Title>Default Card</Card.Title>
              <Card.Description>Uses our theme tokens</Card.Description>
            </Card.Header>
            <Card.Body>
              <Text color="secondary.700">Card content here</Text>
            </Card.Body>
            <Card.Footer>
              <Button size="sm">Action</Button>
            </Card.Footer>
          </Card.Root>

          <Card.Root variant="outline">
            <Card.Header>
              <Card.Title>Outline Card</Card.Title>
              <Card.Description>With border token</Card.Description>
            </Card.Header>
            <Card.Body>
              <Text color="secondary.700">Card content here</Text>
            </Card.Body>
          </Card.Root>

          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Elevated Card</Card.Title>
              <Card.Description>With shadow</Card.Description>
            </Card.Header>
            <Card.Body>
              <Text color="secondary.700">Card content here</Text>
            </Card.Body>
          </Card.Root>
        </Grid>
      </Section>

      <Section title="Progress & Loading (Quick)">
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          <VStack align="stretch" gap={4}>
            <SubSection title="Progress Bar">
              <VStack align="stretch" gap={2}>
                <Progress.Root value={30} colorPalette="primary">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <Progress.Root value={60} colorPalette="blue">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <Progress.Root value={80} colorPalette="orange">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>
            </SubSection>
          </VStack>

          <VStack align="stretch" gap={4}>
            <SubSection title="Spinner">
              <HStack gap={6} flexWrap="wrap">
                <Spinner colorPalette="primary" />
                <Spinner colorPalette="blue" />
                <Spinner colorPalette="orange" />
                <Spinner size="lg" colorPalette="primary" />
              </HStack>
            </SubSection>

            <SubSection title="Skeleton">
              <VStack align="stretch" gap={2}>
                <Skeleton height="20px" />
                <Skeleton height="20px" width="80%" />
                <Skeleton height="20px" width="60%" />
              </VStack>
            </SubSection>
          </VStack>
        </Grid>
      </Section>
    </>
  );
}

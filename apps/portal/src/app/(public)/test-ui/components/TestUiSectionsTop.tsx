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
  type SupportedColorPalette,
} from '@trycompai/ui-new';
import { ColorRow, Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsTop({ palette }: { palette: SupportedColorPalette }) {
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
        <SubSection title="Variants">
          <HStack gap={4} flexWrap="wrap">
            <Button colorPalette={palette}>Default Button</Button>
            <Button colorPalette={palette} variant="outline">
              Outline
            </Button>
            <Button colorPalette={palette} variant="ghost">
              Ghost
            </Button>
            <Button colorPalette={palette} isLink>
              Link
            </Button>
          </HStack>
        </SubSection>

        <SubSection title="Sizes">
          <HStack gap={4} alignItems="center" flexWrap="wrap">
            <Button colorPalette={palette} size="xs">
              XS Button
            </Button>
            <Button colorPalette={palette} size="sm">
              SM Button
            </Button>
            <Button colorPalette={palette} size="md">
              MD Button
            </Button>
            <Button colorPalette={palette} size="lg">
              LG Button
            </Button>
            <Button colorPalette={palette} size="xl">
              XL Button
            </Button>
          </HStack>
        </SubSection>

        <SubSection title="States">
          <HStack gap={4} flexWrap="wrap">
            <Button colorPalette={palette}>Normal</Button>
            <Button colorPalette={palette} disabled>
              Disabled
            </Button>
            <Button colorPalette={palette} loading>
              Loading
            </Button>
          </HStack>
        </SubSection>
      </Section>

      <Section title="Badges">
        <SubSection title="Variants">
          <HStack gap={4} flexWrap="wrap">
            <Badge colorPalette={palette} variant="solid">
              Solid
            </Badge>
            <Badge colorPalette={palette} variant="subtle">
              Subtle
            </Badge>
            <Badge colorPalette={palette} variant="outline">
              Outline
            </Badge>
            <Badge colorPalette={palette} variant="surface">
              Surface
            </Badge>
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
                <Checkbox.Root defaultChecked colorPalette={palette}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Checked</Checkbox.Label>
                </Checkbox.Root>
                <Checkbox.Root colorPalette={palette}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Unchecked</Checkbox.Label>
                </Checkbox.Root>
              </VStack>
            </SubSection>

            <SubSection title="Switch">
              <VStack align="start" gap={2}>
                <Switch.Root defaultChecked colorPalette={palette}>
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>Enabled</Switch.Label>
                </Switch.Root>
                <Switch.Root colorPalette={palette}>
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>Disabled</Switch.Label>
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
                <Progress.Root value={30} colorPalette={palette}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <Progress.Root value={60} colorPalette={palette}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <Progress.Root value={80} colorPalette={palette}>
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
                <Spinner colorPalette={palette} />
                <Spinner size="lg" colorPalette={palette} />
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

'use client';

import {
  Badge,
  Box,
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
import { ColorRow, Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsTop() {
  return (
    <>
      <Section title="Color Tokens (Comp)">
        <Text color="gray.600" mb={4}>
          Theme palettes (primary, secondary, and accent palettes)
        </Text>
        <VStack align="start" gap={8}>
          <ColorRow name="primary" description="comp green" />
          <ColorRow name="secondary" description="neutral / gray scale" />
          <ColorRow name="blue" description="accent blue" />
          <ColorRow name="orange" description="accent orange" />
          <ColorRow name="rose" description="accent rose" />
          <ColorRow name="yellow" description="accent yellow" />
          <ColorRow name="sand" description="accent sand" />
        </VStack>
      </Section>

      <Section title="Surface Tokens">
        <Text color="gray.600" mb={4}>
          Simple surfaces using our theme palettes
        </Text>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          <Box
            bg="white"
            color="gray.900"
            p={4}
            borderWidth="1px"
            borderColor="secondary.200"
            borderRadius="md"
          >
            white / gray.900
          </Box>
          <Box
            bg="secondary.50"
            color="secondary.900"
            p={4}
            borderWidth="1px"
            borderColor="secondary.200"
            borderRadius="md"
          >
            secondary.50 / secondary.900
          </Box>
          <Box
            bg="secondary.100"
            color="secondary.900"
            p={4}
            borderWidth="1px"
            borderColor="secondary.200"
            borderRadius="md"
          >
            secondary.100 / secondary.900
          </Box>
          <Box
            bg="secondary.900"
            color="white"
            p={4}
            borderWidth="1px"
            borderColor="secondary.700"
            borderRadius="md"
          >
            secondary.900 / white
          </Box>
          <Box
            bg="primary.50"
            color="primary.900"
            p={4}
            borderWidth="1px"
            borderColor="primary.200"
            borderRadius="md"
          >
            primary.50 / primary.900
          </Box>
          <Box
            bg="blue.50"
            color="blue.900"
            p={4}
            borderWidth="1px"
            borderColor="blue.200"
            borderRadius="md"
          >
            blue.50 / blue.900
          </Box>
        </Grid>
        <HStack gap={4} mt={4} flexWrap="wrap">
          <Box p={4} borderWidth="1px" borderColor="secondary.200" borderRadius="md">
            border: secondary.200
          </Box>
          <Box p={4} borderWidth="2px" borderColor="primary.700" borderRadius="md">
            focus: primary.700
          </Box>
        </HStack>
      </Section>

      <Section title="Buttons">
        <SubSection title="Default (Primary)">
          <Text color="gray.600" fontSize="sm" mb={2}>
            Button variants
          </Text>
          <HStack gap={4} flexWrap="wrap">
            <Button>Default Button</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="plain">Plain</Button>
          </HStack>
        </SubSection>

        <SubSection title="Color Palettes">
          <HStack gap={4} flexWrap="wrap">
            <Button colorPalette="primary">Primary</Button>
            <Button colorPalette="secondary">Secondary</Button>
            <Button colorPalette="blue">Blue</Button>
            <Button colorPalette="orange">Orange</Button>
            <Button colorPalette="rose">Rose</Button>
            <Button colorPalette="yellow">Yellow</Button>
            <Button colorPalette="sand">Sand</Button>
          </HStack>
        </SubSection>

        <SubSection title="Sizes">
          <HStack gap={4} alignItems="center" flexWrap="wrap">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="md">MD</Button>
            <Button size="lg">LG</Button>
            <Button size="xl">XL</Button>
          </HStack>
        </SubSection>

        <SubSection title="States">
          <HStack gap={4} flexWrap="wrap">
            <Button>Normal</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
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

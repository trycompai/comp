import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading, Stack, Text } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Typography/Heading',
  component: Heading,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
    },
    variant: {
      control: 'select',
      options: ['default', 'muted'],
    },
    tracking: {
      control: 'select',
      options: ['default', 'tight'],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllLevels: Story = {
  render: () => (
    <Stack gap="4">
      <Heading level="1">Heading Level 1</Heading>
      <Heading level="2">Heading Level 2</Heading>
      <Heading level="3">Heading Level 3</Heading>
      <Heading level="4">Heading Level 4</Heading>
      <Heading level="5">Heading Level 5</Heading>
      <Heading level="6">Heading Level 6</Heading>
    </Stack>
  ),
};

export const Muted: Story = {
  render: () => (
    <Stack gap="4">
      <Heading level="1" variant="muted">
        Muted Heading 1
      </Heading>
      <Heading level="2" variant="muted">
        Muted Heading 2
      </Heading>
      <Heading level="3" variant="muted">
        Muted Heading 3
      </Heading>
    </Stack>
  ),
};

export const TextSizes: Story = {
  name: 'Text - All Sizes',
  render: () => (
    <Stack gap="3">
      <Text size="xs">Extra small text (xs)</Text>
      <Text size="sm">Small text (sm)</Text>
      <Text size="base">Base text (base)</Text>
      <Text size="lg">Large text (lg)</Text>
    </Stack>
  ),
};

export const TextVariants: Story = {
  name: 'Text - Variants',
  render: () => (
    <Stack gap="3">
      <Text variant="default">Default text color</Text>
      <Text variant="muted">Muted text color</Text>
      <Text variant="primary">Primary text color</Text>
      <Text variant="destructive">Destructive text color</Text>
    </Stack>
  ),
};

export const TextWeights: Story = {
  name: 'Text - Weights',
  render: () => (
    <Stack gap="3">
      <Text weight="normal">Normal weight</Text>
      <Text weight="medium">Medium weight</Text>
      <Text weight="semibold">Semibold weight</Text>
    </Stack>
  ),
};

export const Composition: Story = {
  name: 'Composition Example',
  render: () => (
    <div className="max-w-lg">
      <Stack gap="6">
        <Stack gap="2">
          <Heading level="1">Welcome to the Platform</Heading>
          <Text size="lg" variant="muted">
            Get started with our comprehensive design system.
          </Text>
        </Stack>
        <Stack gap="4">
          <Stack gap="1">
            <Heading level="3">Features</Heading>
            <Text variant="muted">Everything you need to build beautiful interfaces.</Text>
          </Stack>
          <Text>
            Our design system provides a complete set of components, utilities, and patterns to help
            you build consistent user interfaces quickly.
          </Text>
        </Stack>
      </Stack>
    </div>
  ),
};

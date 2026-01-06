import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@trycompai/design-system';

const meta = {
  title: 'Molecules/Stack',
  component: Stack,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['row', 'column'],
    },
    gap: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '6', '8', '10', '12'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
    },
    wrap: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-border bg-muted px-4 py-2 text-sm">{children}</div>
);

export const Column: Story = {
  render: (args) => (
    <Stack {...args}>
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
  args: {
    direction: 'column',
    gap: '4',
  },
};

export const Row: Story = {
  render: (args) => (
    <Stack {...args}>
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
  args: {
    direction: 'row',
    gap: '4',
  },
};

export const Centered: Story = {
  render: (args) => (
    <div className="h-48 rounded-md border border-dashed border-border">
      <Stack {...args}>
        <Box>Centered Content</Box>
      </Stack>
    </div>
  ),
  args: {
    align: 'center',
    justify: 'center',
  },
};

export const SpaceBetween: Story = {
  render: (args) => (
    <div className="w-full">
      <Stack {...args}>
        <Box>Left</Box>
        <Box>Right</Box>
      </Stack>
    </div>
  ),
  args: {
    direction: 'row',
    justify: 'between',
    align: 'center',
  },
};

export const GapSizes: Story = {
  render: () => (
    <Stack gap="8">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">gap="1"</p>
        <Stack direction="row" gap="1">
          <Box>A</Box>
          <Box>B</Box>
          <Box>C</Box>
        </Stack>
      </div>
      <div>
        <p className="mb-2 text-sm text-muted-foreground">gap="4"</p>
        <Stack direction="row" gap="4">
          <Box>A</Box>
          <Box>B</Box>
          <Box>C</Box>
        </Stack>
      </div>
      <div>
        <p className="mb-2 text-sm text-muted-foreground">gap="8"</p>
        <Stack direction="row" gap="8">
          <Box>A</Box>
          <Box>B</Box>
          <Box>C</Box>
        </Stack>
      </div>
    </Stack>
  ),
};

export const Wrapping: Story = {
  render: (args) => (
    <div className="max-w-xs">
      <Stack {...args}>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
        <Box>Item 4</Box>
        <Box>Item 5</Box>
        <Box>Item 6</Box>
      </Stack>
    </div>
  ),
  args: {
    direction: 'row',
    gap: '2',
    wrap: true,
  },
};

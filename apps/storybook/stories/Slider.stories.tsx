import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label, Slider, Stack, Text } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider defaultValue={[50]} max={100} step={1} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="3">
        <div className="flex justify-between">
          <Label>Volume</Label>
          <Text size="sm" variant="muted">
            50%
          </Text>
        </div>
        <Slider defaultValue={[50]} max={100} step={1} />
      </Stack>
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="3">
        <Label>Price Range</Label>
        <Slider defaultValue={[25, 75]} max={100} step={1} />
      </Stack>
    </div>
  ),
};

export const Steps: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="3">
        <Label>Rating (1-5)</Label>
        <Slider defaultValue={[3]} min={1} max={5} step={1} />
      </Stack>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider defaultValue={[50]} max={100} step={1} disabled />
    </div>
  ),
};

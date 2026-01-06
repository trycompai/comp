import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, Input, Label, Stack } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label text',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter your name" />
      </Stack>
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="agree" />
      <Label htmlFor="agree">I agree to the terms</Label>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="email" type="email" required />
      </Stack>
    </div>
  ),
};

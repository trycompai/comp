import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, Label, Stack } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const CheckboxGroup: Story = {
  render: () => (
    <Stack gap="3">
      <div className="flex items-center gap-2">
        <Checkbox id="email" defaultChecked />
        <Label htmlFor="email">Email notifications</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sms" />
        <Label htmlFor="sms">SMS notifications</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="push" />
        <Label htmlFor="push">Push notifications</Label>
      </div>
    </Stack>
  ),
};


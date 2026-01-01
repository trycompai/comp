import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Label, Stack } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'Hello World',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'email@example.com',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </Stack>
    </div>
  ),
};

export const Types: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="4">
        <Stack gap="2">
          <Label htmlFor="text">Text</Label>
          <Input id="text" type="text" placeholder="Text input" />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="email-type">Email</Label>
          <Input id="email-type" type="email" placeholder="email@example.com" />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="password-type">Password</Label>
          <Input id="password-type" type="password" placeholder="••••••••" />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="number">Number</Label>
          <Input id="number" type="number" placeholder="0" />
        </Stack>
      </Stack>
    </div>
  ),
};

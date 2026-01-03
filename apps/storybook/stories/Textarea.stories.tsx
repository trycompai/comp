import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label, Stack, Textarea } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue:
      'This is some pre-filled text content that demonstrates how the textarea looks with content.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[400px]">
      <Stack gap="2">
        <Label htmlFor="message">Your message</Label>
        <Textarea id="message" placeholder="Type your message here..." />
      </Stack>
    </div>
  ),
};

export const WithCharacterCount: Story = {
  render: () => (
    <div className="w-[400px]">
      <Stack gap="2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="Tell us about yourself..." />
        <span className="text-xs text-muted-foreground text-right">0/280</span>
      </Stack>
    </div>
  ),
};

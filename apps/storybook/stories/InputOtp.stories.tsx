import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Stack,
  Text,
} from '@trycompai/design-system';

// Using a wrapper component to avoid complex args type requirements from input-otp
const InputOTPDemo = () => (
  <InputOTP maxLength={6}>
    <InputOTPGroup>
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
      <InputOTPSlot index={2} />
      <InputOTPSlot index={3} />
      <InputOTPSlot index={4} />
      <InputOTPSlot index={5} />
    </InputOTPGroup>
  </InputOTP>
);

const meta = {
  title: 'Molecules/InputOTP',
  component: InputOTPDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputOTPDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSeparator: Story = {
  render: () => (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const FourDigits: Story = {
  render: () => (
    <InputOTP maxLength={4}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Stack gap="4" align="center">
      <Stack gap="2" align="center">
        <Text weight="medium">Verification Code</Text>
        <Text size="sm" variant="muted">
          Enter the 6-digit code sent to your email
        </Text>
      </Stack>
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <Text size="sm" variant="muted">
        Didn't receive a code? <span className="text-primary cursor-pointer">Resend</span>
      </Text>
    </Stack>
  ),
};

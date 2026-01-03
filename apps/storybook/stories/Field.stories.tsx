import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Stack,
} from '@trycompai/ui-shadcn';

const meta = {
  title: 'Molecules/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" placeholder="you@example.com" />
      </Field>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="w-[300px]">
      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input id="username" placeholder="johndoe" />
        <FieldDescription>This will be your public display name.</FieldDescription>
      </Field>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[300px]">
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input id="password" type="password" />
        <FieldError>Password must be at least 8 characters.</FieldError>
      </Field>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-[300px]">
      <Field>
        <FieldLabel htmlFor="name">
          Full Name <span className="text-destructive">*</span>
        </FieldLabel>
        <Input id="name" required />
        <FieldDescription>Enter your legal name as it appears on your ID.</FieldDescription>
      </Field>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-[350px]">
      <Stack gap="4">
        <Field>
          <FieldLabel htmlFor="form-name">Name</FieldLabel>
          <Input id="form-name" placeholder="John Doe" />
        </Field>

        <Field>
          <FieldLabel htmlFor="form-email">Email</FieldLabel>
          <Input id="form-email" type="email" placeholder="john@example.com" />
          <FieldDescription>We'll never share your email.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="form-password">Password</FieldLabel>
          <Input id="form-password" type="password" />
          <FieldError>Password is required.</FieldError>
        </Field>
      </Stack>
    </div>
  ),
};

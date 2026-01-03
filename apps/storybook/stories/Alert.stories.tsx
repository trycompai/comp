import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Stack,
} from '@trycompai/ui-shadcn';
import { Rocket, X } from 'lucide-react';

const meta = {
  title: 'Molecules/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'info', 'success', 'warning', 'destructive'],
    },
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    hideIcon: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple API with title and description props
export const Default: Story = {
  args: {
    variant: 'default',
    title: 'Heads up!',
    description: 'You can add components to your app using the CLI.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Did you know?',
    description: 'You can use keyboard shortcuts to navigate faster.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success!',
    description: 'Your changes have been saved successfully.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    description: 'This action cannot be undone. Please proceed with caution.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    title: 'Error',
    description: 'Your session has expired. Please log in again.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

// All variants together
export const AllVariants: Story = {
  render: () => (
    <div className="w-[450px]">
      <Stack gap="4">
        <Alert variant="default" title="Default" description="This is a default alert." />
        <Alert variant="info" title="Info" description="This is an informational alert." />
        <Alert variant="success" title="Success" description="This is a success alert." />
        <Alert variant="warning" title="Warning" description="This is a warning alert." />
        <Alert variant="destructive" title="Error" description="This is an error alert." />
      </Stack>
    </div>
  ),
};

// Custom icon
export const CustomIcon: Story = {
  args: {
    variant: 'info',
    title: 'New Feature!',
    description: 'Check out our latest update with exciting new features.',
    icon: <Rocket />,
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

// Without icon
export const WithoutIcon: Story = {
  args: {
    variant: 'info',
    title: 'Note',
    description: 'This alert has no icon.',
    hideIcon: true,
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

// With action button (compound component pattern)
export const WithAction: Story = {
  render: () => (
    <div className="w-[450px]">
      <Alert
        variant="info"
        title="New update available"
        description="A new version is ready to install."
      >
        <AlertAction>
          <Button size="xs" variant="ghost">
            <X />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  ),
};

// Compound component pattern for complex layouts
export const CompoundPattern: Story = {
  render: () => (
    <div className="w-[450px]">
      <Alert variant="warning">
        <AlertTitle>
          <span>Rate limit warning</span>
        </AlertTitle>
        <AlertDescription>
          <p>You have used 80% of your API quota for this month.</p>
          <p>Consider upgrading your plan or contact support for assistance.</p>
        </AlertDescription>
      </Alert>
    </div>
  ),
};

// Description only (no title)
export const DescriptionOnly: Story = {
  args: {
    variant: 'info',
    description: 'This is a simple informational message without a title.',
  },
  render: (args) => (
    <div className="w-[450px]">
      <Alert {...args} />
    </div>
  ),
};

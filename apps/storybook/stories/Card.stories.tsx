import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Stack,
  Text,
} from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'select',
      options: ['auto', 'full', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
      description: 'Fixed width of the card',
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
      description: 'Maximum width constraint',
    },
    size: {
      control: 'select',
      options: ['default', 'sm'],
      description: 'Padding size',
    },
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple API examples
export const SimpleAPI: Story = {
  args: {
    title: 'Card Title',
    description: 'This is a simple card using the props-based API.',
    width: 'md',
    children: (
      <Text>Content is automatically wrapped in CardContent. No need for compound components!</Text>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    width: 'sm',
    children: <Text>This action cannot be undone.</Text>,
    footer: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button>Confirm</Button>
      </>
    ),
  },
};

export const WithHeaderAction: Story = {
  args: {
    title: 'Team Settings',
    description: 'Manage your team preferences',
    headerAction: <Badge variant="secondary">Pro</Badge>,
    width: 'md',
    children: <Text>Configure your team settings here.</Text>,
  },
};

export const FullExample: Story = {
  args: {
    title: 'Create Project',
    description: 'Start a new project from scratch',
    headerAction: (
      <Button variant="ghost" size="icon-sm">
        ✕
      </Button>
    ),
    width: 'md',
    children: (
      <Stack gap="4">
        <Stack gap="2">
          <Label>Project Name</Label>
          <Input placeholder="My awesome project" />
        </Stack>
        <Stack gap="2">
          <Label>Description</Label>
          <Input placeholder="What's this project about?" />
        </Stack>
      </Stack>
    ),
    footer: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button>Create Project</Button>
      </>
    ),
  },
};

// Compound component examples (for advanced use cases)
export const CompoundComponents: Story = {
  render: () => (
    <Card width="md">
      <CardHeader>
        <CardTitle>Advanced Layout</CardTitle>
        <CardDescription>Using compound components for full control</CardDescription>
        <CardAction>
          <Badge>New</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Text>
          Use compound components when you need custom layouts or multiple content sections.
        </Text>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  args: {
    width: 'sm',
    children: <Text variant="muted">A minimal card with just content, no header or footer.</Text>,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    width: 'sm',
    title: 'Compact Card',
    description: 'Smaller padding for compact layouts.',
    children: <Text size="sm">This card uses the small size variant.</Text>,
  },
};

// Width examples - fixed widths that maintain size regardless of content
export const Widths: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="sm" (384px)
        </Text>
        <Card width="sm" title="Small Width">
          <Text size="sm">Fixed width card</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="md" (448px)
        </Text>
        <Card width="md" title="Medium Width">
          <Text size="sm">Fixed width card</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="lg" (512px)
        </Text>
        <Card width="lg" title="Large Width">
          <Text size="sm">Fixed width card</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="xl" (576px)
        </Text>
        <Card width="xl" title="Extra Large Width">
          <Text size="sm">Fixed width card</Text>
        </Card>
      </Stack>
    </Stack>
  ),
};

// Auto width - shrinks to content (default)
export const AutoWidth: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="auto" (default) - shrinks to content
        </Text>
        <Card width="auto" title="Auto Width">
          <Text size="sm">Short content</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="auto" with longer content
        </Text>
        <Card width="auto" title="Auto Width">
          <Text size="sm">
            This card has longer content so it will be wider, but still shrinks to fit.
          </Text>
        </Card>
      </Stack>
    </Stack>
  ),
};

// Full width - fills container
export const FullWidth: Story = {
  render: () => (
    <div className="w-[600px]">
      <Card width="full" title="Full Width Card" description="Fills the parent container">
        <Text size="sm">This card takes up the full width of its container (600px here).</Text>
      </Card>
    </div>
  ),
};

// MaxWidth vs Width comparison
export const MaxWidthVsWidth: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          maxWidth="md" - constrains max, but shrinks to content
        </Text>
        <Card maxWidth="md" title="Max Width">
          <Text size="sm">Short</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="md" - fixed width, maintains size
        </Text>
        <Card width="md" title="Fixed Width">
          <Text size="sm">Short</Text>
        </Card>
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          width="full" + maxWidth="md" - fills container up to max
        </Text>
        <div className="w-[600px]">
          <Card width="full" maxWidth="md" title="Full + Max">
            <Text size="sm">Fills container but constrained by maxWidth</Text>
          </Card>
        </div>
      </Stack>
    </Stack>
  ),
};

export const LoginCard: Story = {
  render: () => (
    <Card
      width="sm"
      title="Welcome back"
      description="Enter your credentials to continue"
      footer={
        <div className="w-full text-center">
          <Text size="sm" variant="muted">
            Don't have an account? Sign up
          </Text>
        </div>
      }
    >
      <Stack gap="4">
        <Stack gap="2">
          <Label>Email</Label>
          <Input type="email" placeholder="email@example.com" />
        </Stack>
        <Stack gap="2">
          <Label>Password</Label>
          <Input type="password" placeholder="••••••••" />
        </Stack>
        <div className="w-full">
          <Button>Sign In</Button>
        </div>
      </Stack>
    </Card>
  ),
};

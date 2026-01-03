import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Heading,
  PageLayout,
  Stack,
  Text,
} from '@trycompai/ui-shadcn';

const meta = {
  title: 'Layout/PageLayout',
  component: PageLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'center'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'default', 'lg'],
    },
  },
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="min-h-[400px]">
      <PageLayout variant="default" padding="default">
        <div className="max-w-4xl">
          <Stack gap="6">
            <Heading level="1">Page Title</Heading>
            <Text variant="muted">
              This is a default page layout with content flowing from top.
            </Text>
            <Card>
              <CardContent>
                <div className="py-4">
                  <Text>Page content goes here</Text>
                </div>
              </CardContent>
            </Card>
          </Stack>
        </div>
      </PageLayout>
    </div>
  ),
};

export const Centered: Story = {
  render: () => (
    <div className="min-h-[400px]">
      <PageLayout variant="center" contentWidth="md">
        <Card width="full">
          <CardHeader>
            <Stack align="center" gap="1.5" textAlign="center">
              <Heading level="2">Sign In</Heading>
              <Text variant="muted">Welcome back! Please sign in to continue.</Text>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack gap="3">
              <Button width="full">Sign In with Email</Button>
              <Button variant="outline" width="full">
                Continue with Google
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  ),
};

export const AuthPage: Story = {
  render: () => (
    <div className="min-h-[500px]">
      <PageLayout variant="center" padding="lg" contentWidth="lg">
        <Card width="full">
          <CardHeader>
            <Stack align="center" gap="3" textAlign="center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xl font-bold text-primary">A</span>
              </div>
              <Stack align="center" gap="1">
                <Heading level="1">Create an account</Heading>
                <Text variant="muted">Get started with your free account today</Text>
              </Stack>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack gap="4">
              <Button width="full">Sign up with Email</Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Stack direction="row" gap="2">
                <div className="flex-1">
                  <Button variant="outline" width="full">
                    Google
                  </Button>
                </div>
                <div className="flex-1">
                  <Button variant="outline" width="full">
                    GitHub
                  </Button>
                </div>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  ),
};

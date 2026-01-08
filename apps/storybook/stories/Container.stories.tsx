import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, Container, Stack, Text } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', 'full'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'default', 'lg'],
    },
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="bg-muted/80 py-8">
      <Container>
        <Card>
          <CardContent>
            <div className="py-4">
              <Text>This content is centered within a Container (default: xl size)</Text>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="py-8">
      <Stack gap="4">
        <Container size="sm">
          <div className="bg-muted/50 p-4 text-center">
            <Text size="sm" variant="muted">
              Container size="sm" (640px)
            </Text>
          </div>
        </Container>
        <Container size="md">
          <div className="bg-muted/50 p-4 text-center">
            <Text size="sm" variant="muted">
              Container size="md" (768px)
            </Text>
          </div>
        </Container>
        <Container size="lg">
          <div className="bg-muted/50 p-4 text-center">
            <Text size="sm" variant="muted">
              Container size="lg" (1024px)
            </Text>
          </div>
        </Container>
        <Container size="xl">
          <div className="bg-muted/50 p-4 text-center">
            <Text size="sm" variant="muted">
              Container size="xl" (1280px)
            </Text>
          </div>
        </Container>
        <Container size="2xl">
          <div className="bg-muted/50 p-4 text-center">
            <Text size="sm" variant="muted">
              Container size="2xl" (1536px)
            </Text>
          </div>
        </Container>
      </Stack>
    </div>
  ),
};

export const WithPadding: Story = {
  render: () => (
    <div className="bg-muted/80">
      <Container size="md">
        <Card>
          <CardContent>
            <div className="py-4">
              <Text>Container with large padding</Text>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  ),
};

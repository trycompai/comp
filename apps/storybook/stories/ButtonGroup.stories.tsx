import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ButtonGroup, ButtonGroupText, Stack, Text } from '@trycompai/design-system';
import { ChevronLeft, ChevronRight, Grid, List, Minus, Plus } from 'lucide-react';

const meta = {
  title: 'Molecules/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const Counter: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Minus className="h-4 w-4" />
      </Button>
      <ButtonGroupText variant="display">5</ButtonGroupText>
      <Button variant="outline" size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const ViewSwitcher: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Grid className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <List className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Small
        </Text>
        <ButtonGroup>
          <Button variant="default" size="sm">
            One
          </Button>
          <Button variant="default" size="sm">
            Two
          </Button>
          <Button variant="default" size="sm">
            Three
          </Button>
        </ButtonGroup>
      </Stack>
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Default
        </Text>
        <ButtonGroup>
          <Button variant="default">One</Button>
          <Button variant="default">Two</Button>
          <Button variant="default">Three</Button>
        </ButtonGroup>
      </Stack>
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Large
        </Text>
        <ButtonGroup>
          <Button variant="default" size="lg">
            One
          </Button>
          <Button variant="default" size="lg">
            Two
          </Button>
          <Button variant="default" size="lg">
            Three
          </Button>
        </ButtonGroup>
      </Stack>
    </Stack>
  ),
};

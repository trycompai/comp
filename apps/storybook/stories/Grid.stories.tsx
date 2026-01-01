import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, Grid, Stack, Text } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Layout/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    cols: {
      control: 'select',
      options: ['1', '2', '3', '4', '5', '6'],
    },
    gap: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '6', '8'],
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

const GridItem = ({ children }: { children: React.ReactNode }) => (
  <Card>
    <CardContent>
      <div className="flex items-center justify-center py-8">
        <Text weight="medium">{children}</Text>
      </div>
    </CardContent>
  </Card>
);

export const TwoColumns: Story = {
  render: () => (
    <Grid cols="2" gap="4">
      <GridItem>1</GridItem>
      <GridItem>2</GridItem>
      <GridItem>3</GridItem>
      <GridItem>4</GridItem>
    </Grid>
  ),
};

export const ThreeColumns: Story = {
  render: () => (
    <Grid cols="3" gap="4">
      <GridItem>1</GridItem>
      <GridItem>2</GridItem>
      <GridItem>3</GridItem>
      <GridItem>4</GridItem>
      <GridItem>5</GridItem>
      <GridItem>6</GridItem>
    </Grid>
  ),
};

export const FourColumns: Story = {
  render: () => (
    <Grid cols="4" gap="4">
      <GridItem>1</GridItem>
      <GridItem>2</GridItem>
      <GridItem>3</GridItem>
      <GridItem>4</GridItem>
      <GridItem>5</GridItem>
      <GridItem>6</GridItem>
      <GridItem>7</GridItem>
      <GridItem>8</GridItem>
    </Grid>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Grid cols={{ sm: '2', lg: '4' }} gap="4">
      <GridItem>1</GridItem>
      <GridItem>2</GridItem>
      <GridItem>3</GridItem>
      <GridItem>4</GridItem>
    </Grid>
  ),
};

export const DashboardLayout: Story = {
  render: () => (
    <Stack gap="4">
      <Grid cols={{ sm: '2', lg: '4' }} gap="4">
        <Card>
          <CardContent>
            <div className="py-4">
              <Text size="sm" variant="muted">
                Total Revenue
              </Text>
              <Text size="lg" weight="semibold">
                $45,231.89
              </Text>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="py-4">
              <Text size="sm" variant="muted">
                Subscriptions
              </Text>
              <Text size="lg" weight="semibold">
                +2,350
              </Text>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="py-4">
              <Text size="sm" variant="muted">
                Sales
              </Text>
              <Text size="lg" weight="semibold">
                +12,234
              </Text>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="py-4">
              <Text size="sm" variant="muted">
                Active Now
              </Text>
              <Text size="lg" weight="semibold">
                +573
              </Text>
            </div>
          </CardContent>
        </Card>
      </Grid>
      <Grid cols={{ lg: '2' }} gap="4">
        <Card>
          <CardContent>
            <div className="py-8">
              <Text variant="muted">Chart placeholder</Text>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="py-8">
              <Text variant="muted">Recent sales placeholder</Text>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Stack>
  ),
};

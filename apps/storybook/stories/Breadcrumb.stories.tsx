import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb, Stack, Text } from '@trycompai/design-system';

const meta = {
  title: 'Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    separator: {
      control: 'select',
      options: ['chevron', 'slash', 'arrow'],
    },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple API examples
export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Components' },
    ],
  },
};

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }],
  },
};

export const FourLevels: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Electronics', href: '/products/electronics' },
      { label: 'Smartphones' },
    ],
  },
};

// Separator variants
export const ChevronSeparator: Story = {
  args: {
    separator: 'chevron',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Settings', href: '/settings' },
      { label: 'Profile' },
    ],
  },
};

export const SlashSeparator: Story = {
  args: {
    separator: 'slash',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Settings', href: '/settings' },
      { label: 'Profile' },
    ],
  },
};

export const ArrowSeparator: Story = {
  args: {
    separator: 'arrow',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Settings', href: '/settings' },
      { label: 'Profile' },
    ],
  },
};

export const AllSeparators: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          Chevron (default)
        </Text>
        <Breadcrumb
          separator="chevron"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs', href: '/docs' },
            { label: 'Page' },
          ]}
        />
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          Slash
        </Text>
        <Breadcrumb
          separator="slash"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs', href: '/docs' },
            { label: 'Page' },
          ]}
        />
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          Arrow
        </Text>
        <Breadcrumb
          separator="arrow"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs', href: '/docs' },
            { label: 'Page' },
          ]}
        />
      </Stack>
    </Stack>
  ),
};

// Auto-collapse with maxItems (default: 4)
// Click the "..." to see the dropdown with collapsed items!
export const AutoCollapse: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Electronics', href: '/electronics' },
      { label: 'Phones', href: '/phones' },
      { label: 'Smartphones', href: '/smartphones' },
      { label: 'iPhone 15' },
    ],
    // maxItems defaults to 4, so this will auto-collapse
    // Click the ellipsis to see Products, Electronics, Phones in a dropdown!
  },
};

export const AutoCollapseComparison: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          6 items with maxItems=0 (no collapse)
        </Text>
        <Breadcrumb
          maxItems={0}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Electronics', href: '/electronics' },
            { label: 'Phones', href: '/phones' },
            { label: 'Smartphones', href: '/smartphones' },
            { label: 'iPhone 15' },
          ]}
        />
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          6 items with maxItems=4 (default)
        </Text>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Electronics', href: '/electronics' },
            { label: 'Phones', href: '/phones' },
            { label: 'Smartphones', href: '/smartphones' },
            { label: 'iPhone 15' },
          ]}
        />
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          6 items with maxItems=5
        </Text>
        <Breadcrumb
          maxItems={5}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Electronics', href: '/electronics' },
            { label: 'Phones', href: '/phones' },
            { label: 'Smartphones', href: '/smartphones' },
            { label: 'iPhone 15' },
          ]}
        />
      </Stack>
    </Stack>
  ),
};

export const CustomCollapseSettings: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          maxItems=4, itemsBeforeCollapse=2 → 2 before + ... + 1 after
        </Text>
        <Breadcrumb
          maxItems={4}
          itemsBeforeCollapse={2}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Electronics', href: '/electronics' },
            { label: 'Phones', href: '/phones' },
            { label: 'Smartphones', href: '/smartphones' },
            { label: 'iPhone 15' },
          ]}
        />
      </Stack>
      <Stack gap="1">
        <Text size="xs" variant="muted">
          maxItems=5, itemsBeforeCollapse=2 → 2 before + ... + 2 after
        </Text>
        <Breadcrumb
          maxItems={5}
          itemsBeforeCollapse={2}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Electronics', href: '/electronics' },
            { label: 'Phones', href: '/phones' },
            { label: 'Smartphones', href: '/smartphones' },
            { label: 'iPhone 15' },
          ]}
        />
      </Stack>
    </Stack>
  ),
};

// Manual ellipsis (for custom placement)
export const ManualEllipsis: Story = {
  args: {
    maxItems: 0, // Disable auto-collapse
    items: [
      { label: 'Home', href: '/' },
      { isEllipsis: true },
      { label: 'Components', href: '/components' },
      { label: 'Breadcrumb' },
    ],
  },
};

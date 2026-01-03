import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  Stack,
  Text,
} from '@trycompai/ui-shadcn';

const meta = {
  title: 'Molecules/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'lg',
  },
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" gap="4" align="center">
      <Stack gap="2" align="center">
        <Avatar size="xs">
          <AvatarFallback>XS</AvatarFallback>
        </Avatar>
        <Text size="xs" variant="muted">
          xs
        </Text>
      </Stack>
      <Stack gap="2" align="center">
        <Avatar size="sm">
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
        <Text size="xs" variant="muted">
          sm
        </Text>
      </Stack>
      <Stack gap="2" align="center">
        <Avatar size="default">
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
        <Text size="xs" variant="muted">
          default
        </Text>
      </Stack>
      <Stack gap="2" align="center">
        <Avatar size="lg">
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
        <Text size="xs" variant="muted">
          lg
        </Text>
      </Stack>
      <Stack gap="2" align="center">
        <Avatar size="xl">
          <AvatarFallback>XL</AvatarFallback>
        </Avatar>
        <Text size="xs" variant="muted">
          xl
        </Text>
      </Stack>
    </Stack>
  ),
};

export const SizesWithImages: Story = {
  render: () => (
    <Stack direction="row" gap="4" align="center">
      <Avatar size="xs">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar size="sm">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar size="xl">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </Stack>
  ),
};

export const UserCard: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Stack gap="0.5">
        <Text weight="medium">John Doe</Text>
        <Text size="sm" variant="muted">
          john@example.com
        </Text>
      </Stack>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>B</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  ),
};

export const GroupSizes: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Small
        </Text>
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>C</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      </Stack>
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Default
        </Text>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>C</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      </Stack>
      <Stack gap="2">
        <Text size="sm" variant="muted">
          Large
        </Text>
        <AvatarGroup>
          <Avatar size="lg">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>C</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      </Stack>
    </Stack>
  ),
};

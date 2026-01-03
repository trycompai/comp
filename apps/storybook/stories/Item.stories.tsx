import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  Stack,
} from '@trycompai/ui-shadcn';
import { ChevronRight, FileText, Folder, Mail, Settings, User } from 'lucide-react';

const meta = {
  title: 'Molecules/Item',
  component: Item,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'xs'],
    },
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item>
        <ItemContent>
          <ItemTitle>Item Title</ItemTitle>
          <ItemDescription>Description information</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item>
        <ItemMedia variant="icon">
          <FileText />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Document.pdf</ItemTitle>
          <ItemDescription>2.3 MB • Modified today</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const WithAvatar: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>john.doe@example.com</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item>
        <ItemMedia variant="icon">
          <Settings />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Settings</ItemTitle>
          <ItemDescription>Manage preferences</ItemDescription>
        </ItemContent>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Item>
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item>
        <ItemMedia variant="icon">
          <Mail />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Inbox</ItemTitle>
          <ItemDescription>View all messages</ItemDescription>
        </ItemContent>
        <Badge>12</Badge>
      </Item>
    </div>
  ),
};

export const Outline: Story = {
  render: () => (
    <div className="w-[400px]">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Profile</ItemTitle>
          <ItemDescription>View your profile</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-[400px]">
      <Stack gap="4">
        <Item size="default">
          <ItemContent>
            <ItemTitle>Default Size</ItemTitle>
            <ItemDescription>Standard item height</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="sm">
          <ItemContent>
            <ItemTitle>Small Size</ItemTitle>
            <ItemDescription>Compact item</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="xs">
          <ItemContent>
            <ItemTitle>Extra Small</ItemTitle>
            <ItemDescription>Minimal height</ItemDescription>
          </ItemContent>
        </Item>
      </Stack>
    </div>
  ),
};

export const ItemGroupExample: Story = {
  render: () => (
    <div className="w-[400px]">
      <ItemGroup>
        <Item>
          <ItemMedia variant="icon">
            <Folder />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Documents</ItemTitle>
            <ItemDescription>24 items</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item>
          <ItemMedia variant="icon">
            <Folder />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Photos</ItemTitle>
            <ItemDescription>128 items</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item>
          <ItemMedia variant="icon">
            <Folder />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Downloads</ItemTitle>
            <ItemDescription>12 items</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </div>
  ),
};

export const ClickableItems: Story = {
  render: () => (
    <div className="w-[400px]">
      <ItemGroup>
        <Item render={<a href="#" />}>
          <ItemMedia variant="icon">
            <User />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Profile</ItemTitle>
          </ItemContent>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Item>
        <Item render={<a href="#" />}>
          <ItemMedia variant="icon">
            <Settings />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Settings</ItemTitle>
          </ItemContent>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Item>
        <Item render={<a href="#" />}>
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Messages</ItemTitle>
          </ItemContent>
          <Badge variant="secondary">3</Badge>
        </Item>
      </ItemGroup>
    </div>
  ),
};

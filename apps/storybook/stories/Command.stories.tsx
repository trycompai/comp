import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@trycompai/ui-shadcn';
import { Calculator, Calendar, CreditCard, Settings, Smile, User } from 'lucide-react';

const meta = {
  title: 'Organisms/Command',
  component: Command,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'select',
      options: ['auto', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card width="md">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Calendar />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem>
              <Smile />
              <span>Search Emoji</span>
            </CommandItem>
            <CommandItem>
              <Calculator />
              <span>Calculator</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <User />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCard />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Settings />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </Card>
  ),
};

export const SearchList: Story = {
  render: () => (
    <Card width="sm">
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Recent">
            <CommandItem>Dashboard</CommandItem>
            <CommandItem>Projects</CommandItem>
            <CommandItem>Settings</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="All Pages">
            <CommandItem>Home</CommandItem>
            <CommandItem>About</CommandItem>
            <CommandItem>Contact</CommandItem>
            <CommandItem>Blog</CommandItem>
            <CommandItem>Pricing</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </Card>
  ),
};

export const Compact: Story = {
  render: () => (
    <Card width="sm">
      <Command>
        <CommandInput placeholder="Search actions..." />
        <CommandList>
          <CommandEmpty>No actions found.</CommandEmpty>
          <CommandItem>
            <span>Create new file</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>Open file</span>
            <CommandShortcut>⌘O</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>Save</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>Find and replace</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
        </CommandList>
      </Command>
    </Card>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Stack,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@trycompai/design-system';
import { HelpCircle, Plus, Settings } from 'lucide-react';

const meta = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" variant="outline" />}>
        <Plus className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Add new item</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <Stack direction="row" gap="4">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Top</TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Right</TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Bottom</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Left</TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
    </Stack>
  ),
};

export const Toolbar: Story = {
  render: () => (
    <Stack direction="row" gap="1">
      <Tooltip>
        <TooltipTrigger render={<Button size="icon" variant="ghost" />}>
          <Plus className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Add</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button size="icon" variant="ghost" />}>
          <Settings className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button size="icon" variant="ghost" />}>
          <HelpCircle className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Help</TooltipContent>
      </Tooltip>
    </Stack>
  ),
};

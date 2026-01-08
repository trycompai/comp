import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Stack,
} from '@trycompai/design-system';
import { Settings } from 'lucide-react';

const meta = {
  title: 'Molecules/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Open popover</PopoverTrigger>
      <PopoverContent>
        <Stack gap="4">
          <Stack gap="2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
          </Stack>
          <Stack gap="2">
            <Stack direction="row" align="center" gap="4">
              <div className="w-16">
                <Label htmlFor="width">Width</Label>
              </div>
              <div className="flex-1">
                <Input id="width" defaultValue="100%" />
              </div>
            </Stack>
            <Stack direction="row" align="center" gap="4">
              <div className="w-16">
                <Label htmlFor="height">Height</Label>
              </div>
              <div className="flex-1">
                <Input id="height" defaultValue="25px" />
              </div>
            </Stack>
          </Stack>
        </Stack>
      </PopoverContent>
    </Popover>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button size="icon" variant="outline" />}>
        <Settings className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent>
        <Stack gap="2">
          <h4 className="font-medium leading-none">Settings</h4>
          <p className="text-sm text-muted-foreground">Manage your application settings.</p>
        </Stack>
      </PopoverContent>
    </Popover>
  ),
};

export const Positions: Story = {
  render: () => (
    <Stack direction="row" gap="4">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>Top</PopoverTrigger>
        <PopoverContent side="top">
          <p className="text-sm">Popover on top</p>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>Right</PopoverTrigger>
        <PopoverContent side="right">
          <p className="text-sm">Popover on right</p>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>Bottom</PopoverTrigger>
        <PopoverContent side="bottom">
          <p className="text-sm">Popover on bottom</p>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>Left</PopoverTrigger>
        <PopoverContent side="left">
          <p className="text-sm">Popover on left</p>
        </PopoverContent>
      </Popover>
    </Stack>
  ),
};

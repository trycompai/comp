import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Stack,
  Text,
} from '@trycompai/ui-shadcn';
import { CalendarDays } from 'lucide-react';

const meta = {
  title: 'Organisms/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="link" />}>@nextjs</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex justify-between space-x-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Stack gap="1">
              <h4 className="text-sm font-semibold">@nextjs</h4>
              <Text size="sm">The React Framework – created and maintained by @vercel.</Text>
              <div className="flex items-center pt-2">
                <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                <Text size="xs" variant="muted">
                  Joined December 2021
                </Text>
              </div>
            </Stack>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const UserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger render={<span className="text-sm text-primary cursor-pointer underline" />}>
        John Doe
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex justify-between space-x-4">
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Stack gap="1">
              <h4 className="text-sm font-semibold">John Doe</h4>
              <Text size="sm" variant="muted">
                john.doe@example.com
              </Text>
              <Text size="sm">
                Software Engineer at Acme Inc. Working on design systems and developer tools.
              </Text>
            </Stack>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

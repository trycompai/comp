import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';

const meta = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[400px]">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Make changes to your account here. Click save when you're done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack gap="4">
                <Stack gap="2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" defaultValue="@johndoe" />
                </Stack>
                <div className="w-fit">
                  <Button>Save changes</Button>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password here. After saving, you'll be logged out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack gap="4">
                <Stack gap="2">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" type="password" />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="new">New password</Label>
                  <Input id="new" type="password" />
                </Stack>
                <div className="w-fit">
                  <Button>Save password</Button>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="w-[600px]">
      <Tabs defaultValue="overview">
        <div className="w-full">
          <TabsList>
            <div className="flex-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </div>
            <div className="flex-1">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </div>
            <div className="flex-1">
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </div>
            <div className="flex-1">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </div>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Overview content goes here.</p>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Analytics content goes here.</p>
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Reports content goes here.</p>
          </div>
        </TabsContent>
        <TabsContent value="notifications">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Notifications content goes here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[400px]">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="disabled" disabled>
            Disabled
          </TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Active tab content.</p>
          </div>
        </TabsContent>
        <TabsContent value="other">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Other tab content.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

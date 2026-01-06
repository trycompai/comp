import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Section,
  SectionHeader,
  SectionTitle,
  SectionDescription,
  SectionActions,
  SectionContent,
  Button,
  Card,
  CardContent,
  Text,
  Stack,
  Input,
  Label,
} from '@trycompai/design-system';

const meta = {
  title: 'Molecules/Section',
  component: Section,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Section title="Settings" description="Manage your account settings and preferences.">
      <Card>
        <CardContent>
          <div className="py-4">
            <Text>Section content goes here</Text>
          </div>
        </CardContent>
      </Card>
    </Section>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Section
      title="Team Members"
      description="Manage who has access to this project."
      actions={<Button>Add Member</Button>}
    >
      <Card>
        <CardContent>
          <div className="py-4">
            <Text>Team member list here</Text>
          </div>
        </CardContent>
      </Card>
    </Section>
  ),
};

export const Composable: Story = {
  render: () => (
    <Section>
      <SectionHeader>
        <div>
          <SectionTitle>Notifications</SectionTitle>
          <SectionDescription>Configure how you receive notifications.</SectionDescription>
        </div>
        <SectionActions>
          <Button variant="outline" size="sm">Reset</Button>
          <Button size="sm">Save</Button>
        </SectionActions>
      </SectionHeader>
      <SectionContent>
        <Stack gap="4">
          <Stack gap="2">
            <Label htmlFor="email">Email notifications</Label>
            <Input id="email" placeholder="email@example.com" />
          </Stack>
        </Stack>
      </SectionContent>
    </Section>
  ),
};

export const MultipleSections: Story = {
  render: () => (
    <Stack gap="8">
      <Section title="Profile" description="Your public profile information.">
        <Stack gap="4">
          <Stack gap="2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="John Doe" />
          </Stack>
          <Stack gap="2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" placeholder="Tell us about yourself" />
          </Stack>
        </Stack>
      </Section>

      <Section
        title="Security"
        description="Manage your security settings."
        actions={<Button variant="outline" size="sm">Change Password</Button>}
      >
        <Card>
          <CardContent>
            <div className="py-4">
              <Text size="sm" variant="muted">Last password change: 30 days ago</Text>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Danger Zone" description="Irreversible and destructive actions.">
        <div className="border-destructive/50 border rounded-lg">
          <Card>
            <CardContent>
              <div className="py-4">
                <Stack direction="row" justify="between" align="center">
                  <Stack gap="1">
                    <Text weight="medium">Delete Account</Text>
                    <Text size="sm" variant="muted">
                      Permanently delete your account and all data
                    </Text>
                  </Stack>
                  <Button variant="destructive">Delete</Button>
                </Stack>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </Stack>
  ),
};

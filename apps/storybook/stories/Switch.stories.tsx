import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label, Stack, Switch } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Enable notifications</Label>
    </div>
  ),
};

export const SettingsExample: Story = {
  render: () => (
    <div className="w-[350px]">
      <Stack gap="4">
        <div className="flex items-center justify-between">
          <Stack gap="0.5">
            <Label htmlFor="marketing">Marketing emails</Label>
            <span className="text-xs text-muted-foreground">
              Receive emails about new products and features.
            </span>
          </Stack>
          <Switch id="marketing" />
        </div>
        <div className="flex items-center justify-between">
          <Stack gap="0.5">
            <Label htmlFor="security">Security alerts</Label>
            <span className="text-xs text-muted-foreground">
              Get notified about security updates.
            </span>
          </Stack>
          <Switch id="security" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Stack gap="0.5">
            <Label htmlFor="newsletter">Newsletter</Label>
            <span className="text-xs text-muted-foreground">Weekly digest of what's new.</span>
          </Stack>
          <Switch id="newsletter" />
        </div>
      </Stack>
    </div>
  ),
};

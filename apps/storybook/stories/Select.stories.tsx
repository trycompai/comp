import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Stack,
} from '@trycompai/design-system';

const meta = {
  title: 'Molecules/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[180px]">
      <Select items={{ apple: 'Apple', banana: 'Banana', orange: 'Orange', grape: 'Grape', mango: 'Mango' }}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
          <SelectItem value="grape">Grape</SelectItem>
          <SelectItem value="mango">Mango</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[180px]">
      <Stack gap="2">
        <Label htmlFor="fruit">Favorite Fruit</Label>
        <Select items={{ apple: 'Apple', banana: 'Banana', orange: 'Orange' }}>
          <SelectTrigger id="fruit">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
          </SelectContent>
        </Select>
      </Stack>
    </div>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <div className="w-[200px]">
      <Select
        items={{
          est: 'Eastern Standard Time (EST)',
          cst: 'Central Standard Time (CST)',
          mst: 'Mountain Standard Time (MST)',
          pst: 'Pacific Standard Time (PST)',
          gmt: 'Greenwich Mean Time (GMT)',
          cet: 'Central European Time (CET)',
          eet: 'Eastern European Time (EET)',
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a timezone" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>North America</SelectLabel>
            <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
            <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
            <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
            <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
            <SelectItem value="cet">Central European Time (CET)</SelectItem>
            <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[180px]">
      <Select disabled items={{ '1': 'Option 1', '2': 'Option 2' }}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithDisabledItems: Story = {
  render: () => (
    <div className="w-[180px]">
      <Select items={{ free: 'Free', pro: 'Pro', enterprise: 'Enterprise (Coming Soon)' }}>
        <SelectTrigger>
          <SelectValue placeholder="Select a plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="enterprise" disabled>
            Enterprise (Coming Soon)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem, Label, Stack } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="option-1" />
        <Label htmlFor="option-1">Option 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="option-2" />
        <Label htmlFor="option-2">Option 2</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-3" id="option-3" />
        <Label htmlFor="option-3">Option 3</Label>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <div className="flex gap-4">
      <RadioGroup defaultValue="left">
        <Stack direction="row" gap="4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="left" id="left" />
            <Label htmlFor="left">Left</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="center" id="center" />
            <Label htmlFor="center">Center</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="right" id="right" />
            <Label htmlFor="right">Right</Label>
          </div>
        </Stack>
      </RadioGroup>
    </div>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup defaultValue="startup">
      <Stack gap="4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <RadioGroupItem value="startup" id="startup" />
          </div>
          <Stack gap="1">
            <Label htmlFor="startup">Startup</Label>
            <span className="text-sm text-muted-foreground">
              For small teams just getting started
            </span>
          </Stack>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <RadioGroupItem value="business" id="business" />
          </div>
          <Stack gap="1">
            <Label htmlFor="business">Business</Label>
            <span className="text-sm text-muted-foreground">
              For growing teams with advanced needs
            </span>
          </Stack>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <RadioGroupItem value="enterprise" id="enterprise" />
          </div>
          <Stack gap="1">
            <Label htmlFor="enterprise">Enterprise</Label>
            <span className="text-sm text-muted-foreground">
              For large organizations with custom requirements
            </span>
          </Stack>
        </div>
      </Stack>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1" disabled>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="d-option-1" />
        <Label htmlFor="d-option-1">Option 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="d-option-2" />
        <Label htmlFor="d-option-2">Option 2</Label>
      </div>
    </RadioGroup>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  Stack,
} from '@trycompai/design-system';
import { Copy, DollarSign, Mail, Search } from 'lucide-react';

const meta = {
  title: 'Molecules/InputGroup',
  component: InputGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIconLeft: Story = {
  render: () => (
    <div className="w-[300px]">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search..." />
      </InputGroup>
    </div>
  ),
};

export const WithIconRight: Story = {
  render: () => (
    <div className="w-[300px]">
      <InputGroup>
        <InputGroupInput placeholder="Enter email" />
        <InputGroupAddon align="inline-end">
          <Mail />
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const WithPrefix: Story = {
  render: () => (
    <div className="w-[300px]">
      <InputGroup>
        <InputGroupAddon align="inline-start">https://</InputGroupAddon>
        <InputGroupInput placeholder="example.com" />
      </InputGroup>
    </div>
  ),
};

export const WithSuffix: Story = {
  render: () => (
    <div className="w-[300px]">
      <InputGroup>
        <InputGroupInput placeholder="Username" />
        <InputGroupAddon align="inline-end">@company.com</InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const Currency: Story = {
  render: () => (
    <div className="w-[200px]">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <DollarSign />
        </InputGroupAddon>
        <InputGroupInput type="number" placeholder="0.00" />
        <InputGroupAddon align="inline-end">USD</InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const WithButton: Story = {
  render: () => (
    <div className="w-[350px]">
      <InputGroup>
        <InputGroupInput defaultValue="https://example.com/share/abc123" readOnly />
        <InputGroupButton>
          <Copy />
          Copy
        </InputGroupButton>
      </InputGroup>
    </div>
  ),
};

export const AllExamples: Story = {
  render: () => (
    <div className="w-[350px]">
      <Stack gap="4">
        <Stack gap="2">
          <Label>Search</Label>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>
        </Stack>

        <Stack gap="2">
          <Label>Website</Label>
          <InputGroup>
            <InputGroupAddon align="inline-start">https://</InputGroupAddon>
            <InputGroupInput placeholder="example.com" />
          </InputGroup>
        </Stack>

        <Stack gap="2">
          <Label>Price</Label>
          <InputGroup>
            <InputGroupAddon align="inline-start">$</InputGroupAddon>
            <InputGroupInput type="number" placeholder="0.00" />
            <InputGroupAddon align="inline-end">USD</InputGroupAddon>
          </InputGroup>
        </Stack>
      </Stack>
    </div>
  ),
};

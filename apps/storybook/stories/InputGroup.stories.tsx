import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  Label,
  Stack,
} from '@trycompai/ui-shadcn';
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
        <InputGroupText>
          <Search className="h-4 w-4" />
        </InputGroupText>
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
        <InputGroupText>
          <Mail className="h-4 w-4" />
        </InputGroupText>
      </InputGroup>
    </div>
  ),
};

export const WithPrefix: Story = {
  render: () => (
    <div className="w-[300px]">
      <InputGroup>
        <InputGroupText>https://</InputGroupText>
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
        <InputGroupText>@company.com</InputGroupText>
      </InputGroup>
    </div>
  ),
};

export const Currency: Story = {
  render: () => (
    <div className="w-[200px]">
      <InputGroup>
        <InputGroupText>
          <DollarSign className="h-4 w-4" />
        </InputGroupText>
        <InputGroupInput type="number" placeholder="0.00" />
        <InputGroupText>USD</InputGroupText>
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
          <Copy className="h-4 w-4 mr-2" />
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
            <InputGroupText>
              <Search className="h-4 w-4" />
            </InputGroupText>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>
        </Stack>

        <Stack gap="2">
          <Label>Website</Label>
          <InputGroup>
            <InputGroupText>https://</InputGroupText>
            <InputGroupInput placeholder="example.com" />
          </InputGroup>
        </Stack>

        <Stack gap="2">
          <Label>Price</Label>
          <InputGroup>
            <InputGroupText>$</InputGroupText>
            <InputGroupInput type="number" placeholder="0.00" />
            <InputGroupText>USD</InputGroupText>
          </InputGroup>
        </Stack>
      </Stack>
    </div>
  ),
};

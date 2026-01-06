import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronsUpDown } from 'lucide-react';

const meta = {
  title: 'Molecules/Collapsible',
  component: Collapsible,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card width="sm">
      <Collapsible>
        <Stack direction="row" align="center" justify="between" gap="4">
          <Text weight="semibold">@peduarte starred 3 repositories</Text>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </CollapsibleTrigger>
        </Stack>
        <Stack gap="2">
          <Card size="sm">
            <Text size="sm" font="mono">
              @radix-ui/primitives
            </Text>
          </Card>
          <CollapsibleContent>
            <Stack gap="2">
              <Card size="sm">
                <Text size="sm" font="mono">
                  @radix-ui/colors
                </Text>
              </Card>
              <Card size="sm">
                <Text size="sm" font="mono">
                  @stitches/react
                </Text>
              </Card>
            </Stack>
          </CollapsibleContent>
        </Stack>
      </Collapsible>
    </Card>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Card width="sm">
      <Collapsible defaultOpen>
        <Stack direction="row" align="center" justify="between" gap="4">
          <Text weight="semibold">Files</Text>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <ChevronsUpDown className="h-4 w-4" />
          </CollapsibleTrigger>
        </Stack>
        <CollapsibleContent>
          <Stack gap="1">
            <Text size="sm" variant="muted">
              package.json
            </Text>
            <Text size="sm" variant="muted">
              tsconfig.json
            </Text>
            <Text size="sm" variant="muted">
              README.md
            </Text>
          </Stack>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  ),
};

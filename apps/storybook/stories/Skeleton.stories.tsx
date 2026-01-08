import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton, Stack } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-4 w-[250px]">
      <Skeleton style={{ width: '100%', height: '100%' }} />
    </div>
  ),
};

export const Circle: Story = {
  render: () => (
    <div className="h-12 w-12 rounded-full overflow-hidden">
      <Skeleton style={{ width: '100%', height: '100%', borderRadius: '9999px' }} />
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-full overflow-hidden">
        <Skeleton style={{ width: '100%', height: '100%', borderRadius: '9999px' }} />
      </div>
      <Stack gap="2">
        <div className="h-4 w-[250px]">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="h-4 w-[200px]">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
      </Stack>
    </div>
  ),
};

export const TableSkeleton: Story = {
  render: () => (
    <div className="w-[400px]">
      <Stack gap="3">
        <div className="h-8 w-full">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="h-8 w-full">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="h-8 w-full">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="h-8 w-full">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
      </Stack>
    </div>
  ),
};

export const FormSkeleton: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="4">
        <Stack gap="2">
          <div className="h-4 w-[80px]">
            <Skeleton style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="h-10 w-full">
            <Skeleton style={{ width: '100%', height: '100%' }} />
          </div>
        </Stack>
        <Stack gap="2">
          <div className="h-4 w-[100px]">
            <Skeleton style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="h-10 w-full">
            <Skeleton style={{ width: '100%', height: '100%' }} />
          </div>
        </Stack>
        <div className="h-10 w-full">
          <Skeleton style={{ width: '100%', height: '100%' }} />
        </div>
      </Stack>
    </div>
  ),
};

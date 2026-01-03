import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack } from '@trycompai/ui-shadcn';
import { toast, Toaster } from 'sonner';

const meta = {
  title: 'Organisms/Sonner',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Toaster position="bottom-right" />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Button onClick={() => toast('This is a toast message')}>Show Toast</Button>,
};

export const Success: Story = {
  render: () => <Button onClick={() => toast.success('Successfully saved!')}>Show Success</Button>,
};

export const Error: Story = {
  render: () => <Button onClick={() => toast.error('Something went wrong')}>Show Error</Button>,
};

export const Warning: Story = {
  render: () => (
    <Button onClick={() => toast.warning('Please review your changes')}>Show Warning</Button>
  ),
};

export const Info: Story = {
  render: () => <Button onClick={() => toast.info('Did you know?')}>Show Info</Button>,
};

export const WithDescription: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast.success('Profile updated', {
          description: 'Your changes have been saved successfully.',
        })
      }
    >
      Show with Description
    </Button>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('File deleted', {
          action: {
            label: 'Undo',
            onClick: () => toast.success('File restored'),
          },
        })
      }
    >
      Show with Action
    </Button>
  ),
};

export const PromiseToast: Story = {
  render: () => (
    <Button
      onClick={() => {
        const promise = new Promise<void>((resolve) => setTimeout(resolve, 2000));
        toast.promise(promise, {
          loading: 'Saving...',
          success: 'Saved!',
          error: 'Failed to save',
        });
      }}
    >
      Show Promise Toast
    </Button>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <Stack direction="row" gap="2" wrap>
      <Button variant="outline" onClick={() => toast('Default toast')}>
        Default
      </Button>
      <Button variant="outline" onClick={() => toast.success('Success!')}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error('Error!')}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning('Warning!')}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.info('Info!')}>
        Info
      </Button>
    </Stack>
  ),
};

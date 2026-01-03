import type { Meta, StoryObj } from '@storybook/react-vite';
import { AspectRatio, Stack, Text } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Layout/AspectRatio',
  component: AspectRatio,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Square: Story = {
  args: {
    ratio: 1,
  },
  render: (args) => (
    <div className="w-[300px]">
      <AspectRatio {...args}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
          <Text variant="muted">1:1 Aspect Ratio</Text>
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Video: Story = {
  args: {
    ratio: 16 / 9,
  },
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
          <Text variant="muted">16:9 Video Aspect Ratio</Text>
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Portrait: Story = {
  args: {
    ratio: 3 / 4,
  },
  render: (args) => (
    <div className="w-[200px]">
      <AspectRatio {...args}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
          <Text variant="muted">3:4 Portrait</Text>
        </div>
      </AspectRatio>
    </div>
  ),
};

export const WithImage: Story = {
  args: {
    ratio: 16 / 9,
  },
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="h-full w-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
};

export const Gallery: Story = {
  args: {
    ratio: 1,
  },
  render: () => (
    <div className="w-[600px]">
      <Stack direction="row" gap="4">
        <div className="flex-1">
          <AspectRatio ratio={1}>
            <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
              1
            </div>
          </AspectRatio>
        </div>
        <div className="flex-1">
          <AspectRatio ratio={1}>
            <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
              2
            </div>
          </AspectRatio>
        </div>
        <div className="flex-1">
          <AspectRatio ratio={1}>
            <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
              3
            </div>
          </AspectRatio>
        </div>
      </Stack>
    </div>
  ),
};

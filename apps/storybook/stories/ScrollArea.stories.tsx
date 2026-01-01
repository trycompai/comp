import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea, Separator, Stack } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Molecules/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const tags = [
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Next.js',
  'Vite',
  'Node.js',
  'GraphQL',
  'Prisma',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'Docker',
  'Kubernetes',
  'AWS',
  'Vercel',
  'GitHub Actions',
  'Jest',
  'Cypress',
  'Storybook',
  'Figma',
  'Framer Motion',
  'Radix UI',
  'shadcn/ui',
];

export const Default: Story = {
  render: () => (
    <div className="h-72 w-48 rounded-md border">
      <ScrollArea>
        <div className="p-4">
          <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
          {tags.map((tag) => (
            <div key={tag}>
              <div className="text-sm">{tag}</div>
              <Separator />
              <div className="my-2" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <div className="w-96 whitespace-nowrap rounded-md border">
      <ScrollArea>
        <div className="p-4">
          <Stack direction="row" gap="4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted"
              >
                {i + 1}
              </div>
            ))}
          </Stack>
        </div>
      </ScrollArea>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <div className="h-[200px] w-[350px] rounded-md border p-4">
      <ScrollArea>
        <div className="pr-4">
          <h4 className="mb-4 text-lg font-semibold">Terms of Service</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pulvinar risus non risus
            hendrerit venenatis. Pellentesque sit amet hendrerit risus, sed porttitor quam.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Magna exercitation reprehenderit magna aute tempor cupidatat consequat elit dolor
            adipisicing. Mollit dolor eiusmod sunt ex incididunt cillum quis. Velit duis sit officia
            eiusmod Lorem aliqua enim laboris do dolor eiusmod.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Et fugiat ipsum nisi ullamco. Tempor exercitation excepteur cillum et elit exercitation
            consequat do. Ullamco proident non amet magna elit nisi exercitation enim occaecat do
            labore culpa quis sit.
          </p>
          <p className="text-sm text-muted-foreground">
            Qui magna veniam cupidatat veniam amet do adipisicing exercitation fugiat labore nostrud
            mollit. Est ad laboris et quis. Nisi Lorem nulla voluptate aute veniam tempor.
          </p>
        </div>
      </ScrollArea>
    </div>
  ),
};

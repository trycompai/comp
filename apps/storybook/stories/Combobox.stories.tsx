import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  Label,
  Stack,
} from '@trycompai/ui-shadcn';

const meta = {
  title: 'Molecules/Combobox',
  component: Combobox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
  { value: 'mango', label: 'Mango' },
  { value: 'strawberry', label: 'Strawberry' },
];

export const Default: Story = {
  render: () => (
    <div className="w-[220px]">
      <Combobox>
        <ComboboxInput placeholder="Search fruits..." />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxEmpty>No fruits found.</ComboboxEmpty>
            {fruits.map((fruit) => (
              <ComboboxItem key={fruit.value} value={fruit.value}>
                {fruit.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[220px]">
      <Stack gap="2">
        <Label>Favorite Fruit</Label>
        <Combobox>
          <ComboboxInput placeholder="Search fruits..." />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxEmpty>No fruits found.</ComboboxEmpty>
              {fruits.map((fruit) => (
                <ComboboxItem key={fruit.value} value={fruit.value}>
                  {fruit.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Stack>
    </div>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <div className="w-[260px]">
      <Combobox>
        <ComboboxInput placeholder="Search locations..." />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxEmpty>No locations found.</ComboboxEmpty>
            <ComboboxGroup>
              <ComboboxLabel>North America</ComboboxLabel>
              <ComboboxItem value="nyc">New York City</ComboboxItem>
              <ComboboxItem value="la">Los Angeles</ComboboxItem>
              <ComboboxItem value="toronto">Toronto</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup>
              <ComboboxLabel>Europe</ComboboxLabel>
              <ComboboxItem value="london">London</ComboboxItem>
              <ComboboxItem value="paris">Paris</ComboboxItem>
              <ComboboxItem value="berlin">Berlin</ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[220px]">
      <Combobox disabled>
        <ComboboxInput placeholder="Search fruits..." disabled />
        <ComboboxContent>
          <ComboboxList>
            {fruits.map((fruit) => (
              <ComboboxItem key={fruit.value} value={fruit.value}>
                {fruit.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const WithClearButton: Story = {
  render: () => (
    <div className="w-[220px]">
      <Combobox>
        <ComboboxInput placeholder="Search fruits..." showClear />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxEmpty>No fruits found.</ComboboxEmpty>
            {fruits.map((fruit) => (
              <ComboboxItem key={fruit.value} value={fruit.value}>
                {fruit.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

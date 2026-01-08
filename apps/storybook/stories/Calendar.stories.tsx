import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from '@trycompai/design-system';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

const meta = {
  title: 'Organisms/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <div className="rounded-md border">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </div>
    );
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>({
      from: new Date(),
      to: new Date(new Date().setDate(new Date().getDate() + 7)),
    });
    return (
      <div className="rounded-md border">
        <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
      </div>
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([
      new Date(),
      new Date(new Date().setDate(new Date().getDate() + 2)),
      new Date(new Date().setDate(new Date().getDate() + 5)),
    ]);
    return (
      <div className="rounded-md border">
        <Calendar mode="multiple" selected={dates} onSelect={setDates} />
      </div>
    );
  },
};

export const WithDisabledDates: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const today = new Date();

    return (
      <div className="rounded-md border">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(date) => date < today}
        />
      </div>
    );
  },
};

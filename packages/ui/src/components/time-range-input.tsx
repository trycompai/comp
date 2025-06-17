'use client';

import { differenceInMinutes, parse } from 'date-fns';
import { useEffect, useState } from 'react';
import { Icons } from './icons';

export function TimeRangeInput({
  value,
  onChange,
}: {
  value: { start: string; end: string };
  onChange: (value: { start: string; end: string }) => void;
}) {
  const [startTime, setStartTime] = useState(value.start);
  const [endTime, setEndTime] = useState(value.end);
  const [duration, setDuration] = useState('');

  useEffect(() => {
    setStartTime(value.start);
    setEndTime(value.end);
  }, [value]);

  useEffect(() => {
    if (!startTime || !endTime) {
      return;
    }

    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());
    const diff = differenceInMinutes(end, start);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    setDuration(`${hours}h ${minutes}min`);
  }, [startTime, endTime]);

  return (
    <div className="border-border flex w-full items-center border px-4 py-2">
      <div className="flex flex-1 items-center space-x-2">
        <Icons.Time className="h-5 w-5 text-[#878787]" />
        <input
          type="time"
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            onChange({ ...value, start: e.target.value });
          }}
          className="bg-transparent text-sm focus:outline-hidden"
        />
      </div>
      <div className="mx-4 flex shrink-0 items-center justify-center">
        <Icons.ArrowRightAlt className="h-5 w-5 text-[#878787]" />
      </div>
      <div className="flex flex-1 items-center justify-end space-x-2">
        <input
          type="time"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            onChange({ ...value, end: e.target.value });
          }}
          className="bg-transparent text-sm focus:outline-hidden"
        />
        <span className="text-sm text-[#878787]">{duration}</span>
      </div>
    </div>
  );
}

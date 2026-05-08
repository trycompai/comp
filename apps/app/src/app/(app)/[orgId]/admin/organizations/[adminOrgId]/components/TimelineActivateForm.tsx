'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@trycompai/design-system';
import { Play } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';

interface TimelineActivateFormProps {
  orgId: string;
  timelineId: string;
  onMutate: () => void;
}

export function TimelineActivateForm({
  orgId,
  timelineId,
  onMutate,
}: TimelineActivateFormProps) {
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    setLoading(true);
    try {
      // startDate comes from <input type="date"> as YYYY-MM-DD. Using
      // `new Date(...)` would treat it as UTC midnight and shift the day
      // in negative UTC offsets. Parse as local midnight so the user's
      // chosen calendar day is preserved when serialized to ISO.
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
      const parsed = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(NaN);
      if (Number.isNaN(parsed.getTime())) {
        toast.error('Invalid start date');
        return;
      }
      const res = await api.post(
        `/v1/admin/organizations/${orgId}/timelines/${timelineId}/activate`,
        { startDate: parsed.toISOString() },
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Timeline activated');
      onMutate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="h-8 w-40 text-sm"
      />
      <Button
        size="sm"
        iconLeft={<Play size={14} />}
        loading={loading}
        onClick={handleActivate}
        disabled={!startDate}
      >
        Activate
      </Button>
    </div>
  );
}

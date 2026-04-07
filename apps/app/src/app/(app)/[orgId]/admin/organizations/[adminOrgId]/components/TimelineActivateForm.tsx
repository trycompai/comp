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
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/timelines/${timelineId}/activate`,
      { startDate: new Date(startDate).toISOString() },
    );
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success('Timeline activated');
    onMutate();
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

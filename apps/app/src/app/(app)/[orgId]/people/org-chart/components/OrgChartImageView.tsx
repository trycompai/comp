'use client';

import { useState } from 'react';
import { Button } from '@trycompai/design-system';
import { TrashCan, Upload } from '@trycompai/design-system/icons';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UploadOrgChartDialog } from './UploadOrgChartDialog';

interface OrgChartImageViewProps {
  imageUrl: string;
  chartName: string;
}

export function OrgChartImageView({
  imageUrl,
  chartName,
}: OrgChartImageViewProps) {
  const api = useApi();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/v1/org-chart');

      if (response.error) {
        toast.error('Failed to delete org chart');
        return;
      }

      toast.success('Org chart deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete org chart');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showReplace) {
    return <UploadOrgChartDialog onClose={() => setShowReplace(false)} />;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-foreground">{chartName}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={<Upload size={16} />}
            onClick={() => setShowReplace(true)}
          >
            Replace
          </Button>
          <Button
            variant="destructive"
            size="sm"
            iconLeft={<TrashCan size={16} />}
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Image */}
      <div className="flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={chartName}
          className="max-h-[600px] max-w-full rounded-md object-contain"
        />
      </div>
    </div>
  );
}

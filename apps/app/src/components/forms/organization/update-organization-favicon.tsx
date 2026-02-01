'use client';

import { apiClient } from '@/lib/api-client';
import { Button, Card } from '@trycompai/design-system';
import { ImageAdd, Trash } from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface UpdateOrganizationFaviconProps {
  currentFaviconUrl: string | null;
}

export function UpdateOrganizationFavicon({ currentFaviconUrl }: UpdateOrganizationFaviconProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFaviconUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/svg+xml',
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a PNG, JPEG, ICO, or SVG file');
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Favicon must be less than 1MB');
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        // Upload via API
        const response = await apiClient.put<{ faviconUrl: string }>(
          `/api/organization/${orgId}/favicon`,
          {
            fileName: file.name,
            fileType: file.type,
            fileData: base64,
          },
          orgId,
        );

        if (response.error) {
          toast.error(response.error);
          setIsUploading(false);
          return;
        }

        if (response.data?.faviconUrl) {
          setPreviewUrl(response.data.faviconUrl);
          toast.success('Favicon updated');
        }

        setIsUploading(false);

        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload favicon');
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);

    try {
      const response = await apiClient.delete(`/api/organization/${orgId}/favicon`, orgId);

      if (response.error) {
        toast.error(response.error);
        setIsRemoving(false);
        return;
      }

      setPreviewUrl(null);
      toast.success('Favicon removed');
      setIsRemoving(false);
    } catch (error) {
      toast.error('Failed to remove favicon');
      setIsRemoving(false);
    }
  };

  const isLoading = isUploading || isRemoving;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Trust Center Favicon</Card.Title>
        <Card.Description>
          Upload a custom favicon for your trust center. This will be displayed in browser tabs
          when users visit your trust portal.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="flex items-center gap-4">
          {/* Favicon preview */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Organization favicon"
                fill
                className="object-contain p-2"
              />
            ) : (
              <ImageAdd size={32} className="text-muted-foreground/50" />
            )}
          </div>

          {/* Upload controls */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              loading={isUploading}
            >
              Upload favicon
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isLoading}
                loading={isRemoving}
                iconLeft={<Trash size={16} />}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card.Content>
      <Card.Footer>
        <p className="text-xs text-muted-foreground">
          Recommended: Square image (e.g., 32x32px or 64x64px). PNG, ICO, or SVG format. Max 1MB.
        </p>
      </Card.Footer>
    </Card>
  );
}

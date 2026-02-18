'use client';

import {
  removeTrustFaviconAction,
  updateTrustFaviconAction,
} from '../actions/update-trust-favicon';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface UpdateTrustFaviconProps {
  currentFaviconUrl: string | null;
}

export function UpdateTrustFavicon({ currentFaviconUrl }: UpdateTrustFaviconProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFaviconUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFavicon = useAction(updateTrustFaviconAction, {
    onSuccess: (result) => {
      if (result.data?.faviconUrl) {
        setPreviewUrl(result.data.faviconUrl);
      }
      toast.success('Favicon updated');
    },
    onError: (error) => {
      toast.error(error.error.serverError || 'Failed to upload favicon');
    },
  });

  const removeFavicon = useAction(removeTrustFaviconAction, {
    onSuccess: () => {
      setPreviewUrl(null);
      toast.success('Favicon removed');
    },
    onError: () => {
      toast.error('Failed to remove favicon');
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - favicons can be ico, png, or svg
    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    const allowedExtensions = ['.ico', '.png', '.svg'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Favicon must be .ico, .png, or .svg format');
      return;
    }

    // Validate file size (100KB limit for favicons)
    if (file.size > 100 * 1024) {
      toast.error('Favicon must be less than 100KB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadFavicon.execute({
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = uploadFavicon.status === 'executing' || removeFavicon.status === 'executing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Portal Favicon</CardTitle>
        <CardDescription>
          Upload a favicon for your trust portal. This icon appears in browser tabs and bookmarks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Favicon preview */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Trust portal favicon"
                fill
                className="object-contain p-2"
                sizes="64px"
              />
            ) : (
              <Add className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>

          {/* Upload controls */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              loading={uploadFavicon.status === 'executing'}
            >
              Upload favicon
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFavicon.execute({})}
                disabled={isLoading}
                iconLeft={<TrashCan size={16} />}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Recommended: Square image (16x16, 32x32, or 180x180px). Formats: .ico, .png, or .svg. Max 100KB.
        </div>
      </CardFooter>
    </Card>
  );
}

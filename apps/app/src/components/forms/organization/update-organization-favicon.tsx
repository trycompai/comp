'use client';

import { apiClient } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
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

        // Upload via NestJS API
        const response = await apiClient.post<{ faviconUrl: string }>(
          '/v1/organization/favicon',
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
      const response = await apiClient.delete('/v1/organization/favicon', orgId);

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
      <CardHeader>
        <CardTitle>Trust Center Favicon</CardTitle>
        <CardDescription>
          <div className="max-w-[600px]">
            Upload a custom favicon for your trust center. This will be displayed in browser tabs
            when users visit your trust portal.
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Favicon preview */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Organization favicon"
                fill
                className="object-contain p-2"
              />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
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
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload favicon'
              )}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Recommended: Square image (e.g., 32x32px or 64x64px). PNG, ICO, or SVG format. Max 1MB.
        </div>
      </CardFooter>
    </Card>
  );
}

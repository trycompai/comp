'use client';

import {
  removeOrganizationFaviconAction,
  updateOrganizationFaviconAction,
} from '@/actions/organization/update-organization-favicon-action';
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
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface UpdateOrganizationFaviconProps {
  currentFaviconUrl: string | null;
}

export function UpdateOrganizationFavicon({ currentFaviconUrl }: UpdateOrganizationFaviconProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFaviconUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFavicon = useAction(updateOrganizationFaviconAction, {
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

  const removeFavicon = useAction(removeOrganizationFaviconAction, {
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
              {uploadFavicon.status === 'executing' ? (
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
                onClick={() => removeFavicon.execute({})}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                {removeFavicon.status === 'executing' ? (
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

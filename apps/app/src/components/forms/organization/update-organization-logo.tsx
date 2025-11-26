'use client';

import {
  removeOrganizationLogoAction,
  updateOrganizationLogoAction,
} from '@/actions/organization/update-organization-logo-action';
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

interface UpdateOrganizationLogoProps {
  currentLogoUrl: string | null;
}

export function UpdateOrganizationLogo({ currentLogoUrl }: UpdateOrganizationLogoProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = useAction(updateOrganizationLogoAction, {
    onSuccess: (result) => {
      if (result.data?.logoUrl) {
        setPreviewUrl(result.data.logoUrl);
      }
      toast.success('Logo updated');
    },
    onError: (error) => {
      toast.error(error.error.serverError || 'Failed to upload logo');
    },
  });

  const removeLogo = useAction(removeOrganizationLogoAction, {
    onSuccess: () => {
      setPreviewUrl(null);
      toast.success('Logo removed');
    },
    onError: () => {
      toast.error('Failed to remove logo');
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadLogo.execute({
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

  const isLoading = uploadLogo.status === 'executing' || removeLogo.status === 'executing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Logo</CardTitle>
        <CardDescription>
          <div className="max-w-[600px]">
            Upload your organization's logo. This will be displayed in reports and the trust portal.
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Logo preview */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Organization logo"
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
              accept="image/*"
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
              {uploadLogo.status === 'executing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload logo'
              )}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLogo.execute({})}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                {removeLogo.status === 'executing' ? (
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
          Recommended: Square image, at least 200x200px. Max 2MB.
        </div>
      </CardFooter>
    </Card>
  );
}


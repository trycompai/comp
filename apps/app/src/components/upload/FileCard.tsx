'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardFooter } from '@comp/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@comp/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { ExternalLink, Loader2, Maximize2, Trash } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FileIcon } from './FileIcon';

interface FilePreviewState {
  url: string | null;
  isLoading: boolean;
}

interface FileCardProps {
  url: string;
  previewState: FilePreviewState;
  isDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPreviewClick: (url: string) => Promise<void>;
  onDelete: (url: string) => Promise<void>;
}

export function FileCard({
  url,
  previewState,
  isDialogOpen,
  onOpenChange,
  onPreviewClick,
  onDelete,
}: FileCardProps) {
  const fileName = url.split('/').pop() || url;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  const [hasLoadedPreview, setHasLoadedPreview] = useState(false);

  useEffect(() => {
    if (!hasLoadedPreview && !previewState.url && !previewState.isLoading) {
      onPreviewClick(url);
      setHasLoadedPreview(true);
    }
  }, [hasLoadedPreview, onPreviewClick, previewState.isLoading, previewState.url, url]);

  return (
    <Card className="group flex h-[220px] flex-col overflow-hidden transition-all hover:shadow-md">
      <CardContent className="relative flex-grow overflow-hidden p-0">
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          {/* Preview content directly in the card */}
          <div className="relative flex h-[160px] w-full items-center justify-center p-2">
            {previewState.isLoading ? (
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            ) : previewState.url && isImage ? (
              <div className="relative h-full w-full">
                <Image
                  src={previewState.url}
                  alt={fileName}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
                />
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-background/80 hover:bg-background absolute right-1 bottom-1 h-6 w-6"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
              </div>
            ) : previewState.url && isPdf ? (
              <div className="relative h-full w-full">
                <iframe src={previewState.url} className="h-full w-full" title={fileName} />
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-background/80 hover:bg-background absolute right-1 bottom-1 h-6 w-6"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="bg-accent/20 mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-sm">
                  <FileIcon fileName={fileName} />
                </div>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    {'Preview'}
                  </Button>
                </DialogTrigger>
              </div>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h4 className="max-w-full truncate px-2 text-center text-sm font-medium">
                  {fileName}
                </h4>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fileName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DialogContent className="w-full max-w-4xl">
            <DialogTitle className="mb-4 flex items-center justify-between">
              <span>{`File Preview: ${fileName}`}</span>
            </DialogTitle>

            {previewState.url ? (
              <div className="relative h-[80vh] w-full">
                {isImage ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={previewState.url}
                      alt={fileName}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe src={previewState.url} className="h-full w-full" title={fileName} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">
                      {'Preview not available for this file type'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter className="mt-auto justify-center gap-3 border-t px-3 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" asChild className="h-10 w-10 rounded-full">
                <a
                  href={previewState.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center justify-center"
                  onClick={(e) => {
                    if (!previewState.url) {
                      e.preventDefault();
                      onPreviewClick(url);
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{'Open File'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialog>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:text-destructive hover:border-destructive h-10 w-10 rounded-full"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{'Delete File'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{'Delete File'}</AlertDialogTitle>
              <AlertDialogDescription>
                {'This action cannot be undone. The file will be permanently deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(url)}>{'Delete'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

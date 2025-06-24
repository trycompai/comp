'use client';

import { createApiKeyAction } from '@/actions/organization/create-api-key-action';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { Input } from '@comp/ui/input';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Check, Copy, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, onSuccess }: CreateApiKeyDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState<'never' | '30days' | '90days' | '1year'>('never');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { execute: createApiKey, status: isCreating } = useAction(createApiKeyAction, {
    onSuccess: (data) => {
      if (data.data?.data?.key) {
        setCreatedApiKey(data.data.data.key);
        if (onSuccess) onSuccess();
      }
    },
    onError: (error) => {
      toast.error('Failed to create API key');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createApiKey({
      name,
      expiresAt: expiration,
    });
  };

  const handleClose = () => {
    if (isCreating !== 'executing') {
      setName('');
      setExpiration('never');
      setCreatedApiKey(null);
      setCopied(false);
      onOpenChange(false);
    }
  };

  const copyToClipboard = async () => {
    if (createdApiKey) {
      try {
        await navigator.clipboard.writeText(createdApiKey);
        setCopied(true);
        toast.success('API key copied to clipboard');

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        toast.error('Error');
      }
    }
  };

  // Form content for reuse in both Dialog and Sheet/Drawer
  const renderFormContent = () => (
    <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
      <Accordion type="multiple" defaultValue={['api-key']}>
        <AccordionItem value="api-key">
          <AccordionTrigger>{'API Key'}</AccordionTrigger>
          <AccordionContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm leading-none font-medium">
                  {'Name'}
                </label>
                <div className="mt-3">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={'Enter a name for this API key'}
                    required
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="expiration" className="text-sm leading-none font-medium">
                  {'Expiration'}
                </label>
                <div className="mt-3">
                  <Select
                    value={expiration}
                    onValueChange={(value) =>
                      setExpiration(value as 'never' | '30days' | '90days' | '1year')
                    }
                  >
                    <SelectTrigger id="expiration" className="w-full">
                      <SelectValue placeholder={'Select expiration'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">{'Never'}</SelectItem>
                      <SelectItem value="30days">{'30 days'}</SelectItem>
                      <SelectItem value="90days">{'90 days'}</SelectItem>
                      <SelectItem value="1year">{'1 year'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="justify-self-end w-full">
                {'Create'}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  // Created key content for reuse in both Dialog and Sheet/Drawer
  const renderCreatedKeyContent = () => (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{'API Key'}</p>
          <div className="flex items-center">
            <div className="relative w-full">
              <div className="bg-muted overflow-hidden rounded-sm p-3 pr-10">
                <div className="overflow-x-auto">
                  <code className="text-sm break-all">{createdApiKey}</code>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {'This key will only be shown once. Make sure to copy it now.'}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleClose} className="w-full sm:w-auto">
          {'Done'}
        </Button>
      </div>
    </>
  );

  // Shared content for both Sheet and Drawer
  const renderContent = () => (createdApiKey ? renderCreatedKeyContent() : renderFormContent());

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent stack className="rounded-sm">
          <SheetHeader className="mb-8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SheetTitle>{createdApiKey ? 'API Key Created' : 'New API Key'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto rounded-sm p-0 hover:bg-transparent"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription>
              {createdApiKey
                ? "Your API key has been created. Make sure to copy it now as you won't be able to see it again."
                : "Create a new API key for programmatic access to your organization's data."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            {createdApiKey ? <>{renderCreatedKeyContent()}</> : <>{renderFormContent()}</>}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="rounded-sm p-6">
        <DrawerHeader>
          <DrawerTitle>{createdApiKey ? 'API Key Created' : 'New API Key'}</DrawerTitle>
          <DrawerDescription>
            {createdApiKey
              ? "Your API key has been created. Make sure to copy it now as you won't be able to see it again."
              : "Create a new API key for programmatic access to your organization's data."}
          </DrawerDescription>
        </DrawerHeader>
        {createdApiKey ? <>{renderCreatedKeyContent()}</> : <>{renderFormContent()}</>}
      </DrawerContent>
    </Drawer>
  );
}

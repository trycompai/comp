'use client';

import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CreateNewPolicyForm } from '../forms/policies/create-new-policy';

export function CreatePolicySheet() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get('create-policy-sheet') === 'true';

  const handleOpenChange = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set('create-policy-sheet', 'true');
    } else {
      params.delete('create-policy-sheet');
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <SheetTitle>{'Create New Policy'}</SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0 hover:bg-transparent"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <CreateNewPolicyForm />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{'Create New Policy'}</DrawerTitle>
      <DrawerContent className="p-6">
        <CreateNewPolicyForm />
      </DrawerContent>
    </Drawer>
  );
}

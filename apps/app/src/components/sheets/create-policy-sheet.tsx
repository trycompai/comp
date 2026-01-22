'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  ScrollArea,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
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

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create New Policy</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <ScrollArea>
              <CreateNewPolicyForm />
            </ScrollArea>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create New Policy</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <CreateNewPolicyForm />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

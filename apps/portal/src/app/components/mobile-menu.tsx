'use client';

import { Button } from '@gideon-defender/ui/button';
import { Icons } from '@gideon-defender/ui/icons';
import { Sheet, SheetContent } from '@gideon-defender/ui/sheet';
import { useState } from 'react';
import { MainMenu } from './main-menu';

export function MobileMenu() {
  const [isOpen, setOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative flex h-8 w-8 items-center rounded-full md:hidden"
        >
          <Icons.Menu size={16} />
        </Button>
      </div>
      <SheetContent side="left" className="-ml-2 rounded-sm border-none">
        <div className="mb-8 ml-2">
          <Icons.Logo />
        </div>

        <MainMenu onSelect={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

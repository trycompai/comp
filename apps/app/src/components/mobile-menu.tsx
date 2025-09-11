'use client';

import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Sheet, SheetContent } from '@comp/ui/sheet';
import type { Organization } from '@db';
import { useState } from 'react';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';

interface MobileMenuProps {
  organizations: Organization[];
  isCollapsed?: boolean;
  organizationId?: string;
}

export function MobileMenu({ organizationId, organizations }: MobileMenuProps) {
  const [isOpen, setOpen] = useState(false);

  const handleCloseSheet = () => {
    setOpen(false);
  };

  const currentOrganization = organizations.find((org) => org.id === organizationId) || null;

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
        <div className="flex flex-col gap-2">
          <OrganizationSwitcher
            organizations={organizations}
            organization={currentOrganization}
            isCollapsed={false}
          />
          <MainMenu
            organizationId={organizationId}
            organization={currentOrganization}
            onItemClick={handleCloseSheet}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

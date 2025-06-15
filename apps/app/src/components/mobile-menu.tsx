"use client";

import { Button } from "@comp/ui/button";
import { Icons } from "@comp/ui/icons";
import { Sheet, SheetContent } from "@comp/ui/sheet";
import { useState } from "react";
import { MainMenu } from "./main-menu";
import { OrganizationSwitcher } from "./organization-switcher";
import type { Organization as AuthOrganization } from "better-auth/plugins";
import type {
  Organization as DbOrganization,
  FrameworkEditorFramework,
} from "@comp/db/types";

interface MobileMenuProps {
  organizations: AuthOrganization[];
  isCollapsed?: boolean;
  organizationId: string;
  frameworks: Pick<
    FrameworkEditorFramework,
    "id" | "name" | "description" | "version" | "visible"
  >[];
}

export function MobileMenu({
  organizationId,
  organizations,
  frameworks,
}: MobileMenuProps) {
  const [isOpen, setOpen] = useState(false);

  const handleCloseSheet = () => {
    setOpen(false);
  };

  const adaptedOrganizations: DbOrganization[] = organizations.map((org) => ({
    ...org,
    logo: org.logo ?? null,
    metadata: org.metadata ? String(org.metadata) : null,
    stripeCustomerId: null,
    website: null,
    fleetDmLabelId: null,
    isFleetSetupCompleted: false,
  }));

  const currentOrganization =
    adaptedOrganizations.find((org) => org.id === organizationId) || null;

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
            organizations={adaptedOrganizations}
            organization={currentOrganization}
            isCollapsed={false}
            frameworks={frameworks}
          />
          <MainMenu
            organizationId={organizationId}
            onItemClick={handleCloseSheet}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

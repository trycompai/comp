'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';

export interface GcpOrg {
  id: string;
  displayName: string;
  projects: Array<{ id: string; name: string }>;
}

interface GcpProjectPickerProps {
  organizations: GcpOrg[];
  selectedProjectIds: string[];
  onToggleProject: (orgId: string, projectId: string) => void;
}

export function GcpProjectPicker({
  organizations,
  selectedProjectIds,
  onToggleProject,
}: GcpProjectPickerProps) {
  const selectedSet = new Set(selectedProjectIds);
  const count = selectedProjectIds.length;

  const allProjects = organizations.flatMap((o) =>
    o.projects.map((p) => ({ ...p, orgId: o.id })),
  );
  const selectedNames = allProjects
    .filter((p) => selectedSet.has(p.id))
    .map((p) => p.name);

  const label =
    count === 0
      ? 'Select projects'
      : count <= 2
        ? selectedNames.join(', ')
        : `${selectedNames[0]} +${count - 1} more`;

  return (
    <div className="rounded-xl border px-5 py-4 space-y-2">
      <div>
        <p className="text-sm font-semibold">GCP Projects</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select which projects to scan and monitor. Findings and service
          detection are scoped to these projects.
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex w-full max-w-sm items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="min-w-0 truncate font-medium">{label}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              {count > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {count}
                </span>
              )}
              <svg
                className="h-3.5 w-3.5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="min-w-[12rem] max-w-[min(20rem,calc(100vw-2rem))]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {organizations.map((org) => {
            const orgSelectedCount = org.projects.filter((p) =>
              selectedSet.has(p.id),
            ).length;
            return (
              <DropdownMenuSub key={org.id}>
                <DropdownMenuSubTrigger className="text-sm">
                  <span className="truncate">{org.displayName}</span>
                  {orgSelectedCount > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {orgSelectedCount}
                    </span>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[min(20rem,calc(100vh-4rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto">
                  {org.projects.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No projects found
                    </div>
                  ) : (
                    org.projects.map((p) => {
                      const checked = selectedSet.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onToggleProject(org.id, p.id)}
                          className="flex w-full items-center gap-2.5 px-2 py-1.5 text-sm outline-none hover:bg-accent rounded-sm"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {checked && (
                              <svg
                                className="h-3 w-3 text-primary-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="shrink-0">{p.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {p.id}
                          </span>
                        </button>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

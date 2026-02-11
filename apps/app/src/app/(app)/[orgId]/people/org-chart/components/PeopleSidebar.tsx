'use client';

import { useState } from 'react';
import { Button } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';

interface Member {
  id: string;
  user: {
    name: string;
    email: string;
  };
  role: string;
  jobTitle?: string | null;
}

interface PeopleSidebarProps {
  members: Member[];
  onAddMember: (person: {
    name: string;
    title: string;
    memberId?: string;
  }) => void;
  /** Set of member IDs already placed on the chart */
  placedMemberIds: Set<string>;
}

export function PeopleSidebar({
  members,
  onAddMember,
  placedMemberIds,
}: PeopleSidebarProps) {
  const [search, setSearch] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddMember = (member: Member) => {
    onAddMember({
      name: member.user.name,
      title: member.jobTitle || '',
      memberId: member.id,
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onAddMember({ name: customName.trim(), title: customTitle.trim() });
    setCustomName('');
    setCustomTitle('');
    setShowCustomForm(false);
  };

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-3 py-2">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          People
        </h3>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredMembers.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No members found
          </p>
        ) : (
          filteredMembers.map((member) => {
            const isPlaced = placedMemberIds.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => !isPlaced && handleAddMember(member)}
                disabled={isPlaced}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                  isPlaced
                    ? 'cursor-default opacity-40'
                    : 'hover:bg-muted cursor-pointer'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {member.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {member.user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {member.jobTitle || member.user.email}
                  </span>
                </div>
                {isPlaced && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    Added
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Add custom person */}
      <div className="border-t border-border px-3 py-2">
        {showCustomForm ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Title / Role"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomName('');
                  setCustomTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Add size={14} />
            <span>Add custom person</span>
          </button>
        )}
      </div>
    </div>
  );
}

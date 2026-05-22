'use client';

import type { EvidenceSubmissionInfo } from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, FrameworkEditorRequirement, Task } from '@db';
import {
  Button,
  Heading,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ChevronDown, ChevronRight, Search } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useState } from 'react';
import { FamilyFilterDropdown } from './FamilyFilterDropdown';
import {
  buildControlItems,
  buildRequirementMap,
  type ControlItem,
} from './framework-controls-shared';
import { GroupedControlRow } from './GroupedControlRow';

const COLUMN_COUNT = 7;

interface FamilyGroup {
  family: string;
  items: ControlItem[];
}

function groupByFamily(items: ControlItem[]): FamilyGroup[] {
  const familyMap = new Map<string, ControlItem[]>();
  const otherItems: ControlItem[] = [];

  for (const item of items) {
    const family = item.control.controlTemplate?.controlFamily;
    if (family) {
      const existing = familyMap.get(family);
      if (existing) {
        existing.push(item);
      } else {
        familyMap.set(family, [item]);
      }
    } else {
      otherItems.push(item);
    }
  }

  const sortedFamilies = Array.from(familyMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const groups: FamilyGroup[] = sortedFamilies.map(([family, items]) => ({
    family,
    items: items.sort((a, b) => a.control.name.localeCompare(b.control.name)),
  }));

  if (otherItems.length > 0) {
    groups.push({
      family: 'Other',
      items: otherItems.sort((a, b) => a.control.name.localeCompare(b.control.name)),
    });
  }

  return groups;
}

export function FrameworkControlsGrouped({
  frameworkInstanceWithControls,
  requirementDefinitions,
  tasks,
  evidenceSubmissions = [],
}: {
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  requirementDefinitions: FrameworkEditorRequirement[];
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<Set<string>>(new Set());

  const requirementMap = useMemo(
    () => buildRequirementMap(requirementDefinitions),
    [requirementDefinitions],
  );

  const allItems = useMemo(
    () => buildControlItems(frameworkInstanceWithControls.controls, requirementMap),
    [frameworkInstanceWithControls.controls, requirementMap],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return allItems;
    const lower = searchTerm.toLowerCase();
    return allItems.filter(
      (item) =>
        item.control.name.toLowerCase().includes(lower) ||
        item.control.description?.toLowerCase().includes(lower) ||
        item.requirements.some(
          (r) => r.name.toLowerCase().includes(lower) || r.identifier.toLowerCase().includes(lower),
        ),
    );
  }, [allItems, searchTerm]);

  const allGroups = useMemo(() => groupByFamily(filteredItems), [filteredItems]);

  const groups = useMemo(() => {
    if (selectedFamilyFilter.size === 0) return allGroups;
    return allGroups.filter((g) => selectedFamilyFilter.has(g.family));
  }, [allGroups, selectedFamilyFilter]);

  const allFamilyNames = useMemo(() => allGroups.map((g) => g.family), [allGroups]);

  useEffect(() => {
    if (!initialized && allFamilyNames.length > 0) {
      setExpandedFamilies(new Set(allFamilyNames));
      setInitialized(true);
    }
  }, [initialized, allFamilyNames]);

  const isSearching = searchTerm.trim().length > 0;
  const allExpanded = groups.length > 0 && groups.every((g) => expandedFamilies.has(g.family));

  const handleToggleFamily = (family: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedFamilies(new Set());
    } else {
      setExpandedFamilies(new Set(allFamilyNames));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleToggleFamilyFilter = (family: string) => {
    setSelectedFamilyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  };

  const handleClearFamilyFilter = () => {
    setSelectedFamilyFilter(new Set());
  };

  const isFamilyExpanded = (family: string) => isSearching || expandedFamilies.has(family);

  return (
    <div className="space-y-4">
      <Heading level="2">Controls ({filteredItems.length})</Heading>
      <div className="flex items-center gap-3">
        <div className="w-full max-w-sm">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search controls..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </InputGroup>
        </div>
        <FamilyFilterDropdown
          allFamilyNames={allFamilyNames}
          selectedFamilies={selectedFamilyFilter}
          onToggleFamily={handleToggleFamilyFilter}
          onClear={handleClearFamilyFilter}
        />
        {!isSearching && (
          <Button variant="secondary" onClick={handleToggleAll}>
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <FamilySection
                key={group.family}
                group={group}
                expanded={isFamilyExpanded(group.family)}
                onToggle={() => handleToggleFamily(group.family)}
                tasks={tasks}
                evidenceSubmissions={evidenceSubmissions}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FamilySection({
  group,
  expanded,
  onToggle,
  tasks,
  evidenceSubmissions,
}: {
  group: FamilyGroup;
  expanded: boolean;
  onToggle: () => void;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions: EvidenceSubmissionInfo[];
}) {
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow className="bg-secondary hover:bg-secondary/80">
        <TableCell colSpan={COLUMN_COUNT}>
          <button
            type="button"
            className="flex w-full items-center gap-2 py-1 text-left font-medium cursor-pointer"
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }}
            aria-expanded={expanded}
          >
            <ChevronIcon size={16} />
            <span>{group.family}</span>
            <span className="text-muted-foreground text-sm font-normal">
              ({group.items.length})
            </span>
          </button>
        </TableCell>
      </TableRow>
      {expanded &&
        group.items.map(({ control, requirements }) => (
          <GroupedControlRow
            key={control.id}
            control={control}
            requirements={requirements}
            tasks={tasks}
            evidenceSubmissions={evidenceSubmissions}
          />
        ))}
    </>
  );
}

'use client';

import {
  Badge,
  HStack,
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
import { ArrowDown, ArrowUp, ArrowsVertical, Search } from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';

type SortColumn = 'name' | 'compliance' | 'controls';
type SortDirection = 'asc' | 'desc';

interface FrameworksTableProps {
  frameworks: FrameworkInstanceWithControls[];
  complianceMap: Record<string, number>;
  organizationId: string;
}

const FRAMEWORK_BADGES: Record<string, string> = {
  'SOC 2': '/badges/soc2.svg',
  'ISO 27001': '/badges/iso27001.svg',
  'ISO 42001': '/badges/iso42001.svg',
  'HIPAA': '/badges/hipaa.svg',
  'GDPR': '/badges/gdpr.svg',
  'PCI DSS': '/badges/pci-dss.svg',
  'NEN 7510': '/badges/nen7510.svg',
  'ISO 9001': '/badges/iso9001.svg',
};

function getFrameworkStatus(complianceScore: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
} {
  if (complianceScore >= 100) return { label: 'Compliant', variant: 'default' };
  if (complianceScore > 0) return { label: 'In Progress', variant: 'secondary' };
  return { label: 'Not Started', variant: 'destructive' };
}

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) {
  if (sortColumn !== column) {
    return <ArrowsVertical size={14} className="text-muted-foreground opacity-50" />;
  }
  return sortDirection === 'asc' ? (
    <ArrowUp size={14} className="text-foreground" />
  ) : (
    <ArrowDown size={14} className="text-foreground" />
  );
}

export function FrameworksTable({
  frameworks,
  complianceMap,
  organizationId,
}: FrameworksTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let items = [...frameworks];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(
        (fw) =>
          fw.framework.name.toLowerCase().includes(lower) ||
          fw.framework.description?.toLowerCase().includes(lower),
      );
    }

    items.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortColumn) {
        case 'name':
          return dir * a.framework.name.localeCompare(b.framework.name);
        case 'compliance': {
          const scoreA = complianceMap[a.id] ?? 0;
          const scoreB = complianceMap[b.id] ?? 0;
          return dir * (scoreA - scoreB);
        }
        case 'controls':
          return dir * (a.controls.length - b.controls.length);
        default:
          return 0;
      }
    });

    return items;
  }, [frameworks, searchTerm, sortColumn, sortDirection, complianceMap]);

  const handleRowClick = (frameworkId: string) => {
    router.push(`/${organizationId}/frameworks/${frameworkId}`);
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search frameworks..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Text variant="muted">No frameworks found.</Text>
        </div>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>
                <HStack
                  gap="xs"
                  align="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('name')}
                >
                  <span>Framework</span>
                  <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
                </HStack>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <HStack
                  gap="xs"
                  align="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('compliance')}
                >
                  <span>Compliance</span>
                  <SortIcon
                    column="compliance"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </HStack>
              </TableHead>
              <TableHead>
                <HStack
                  gap="xs"
                  align="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('controls')}
                >
                  <span>Controls</span>
                  <SortIcon
                    column="controls"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </HStack>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((fw) => {
              const score = complianceMap[fw.id] ?? 0;
              const roundedScore = Math.round(score);
              const status = getFrameworkStatus(score);
              const badgeSrc = FRAMEWORK_BADGES[fw.framework.name] ?? null;

              return (
                <TableRow
                  key={fw.id}
                  onClick={() => handleRowClick(fw.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <HStack gap="sm" align="center">
                      {badgeSrc ? (
                        <Image
                          src={badgeSrc}
                          alt={fw.framework.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                          <span className="text-[10px] text-muted-foreground">
                            {fw.framework.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <Text size="sm" weight="medium">
                        {fw.framework.name}
                      </Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2">
                      <Text size="sm" variant="muted">
                        {fw.framework.description?.trim() || '—'}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div className="flex-1 rounded-full bg-muted/50 h-1.5">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${roundedScore}%` }}
                        />
                      </div>
                      <div className="tabular-nums w-10 text-right">
                        <Text size="sm" variant="muted">
                          {roundedScore}%
                        </Text>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums">
                      <Text size="sm" variant="muted">
                        {fw.controls.length}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

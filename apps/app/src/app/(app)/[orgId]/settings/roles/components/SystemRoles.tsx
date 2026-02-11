'use client';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ChevronRight } from '@trycompai/design-system/icons';
import { useParams, useRouter } from 'next/navigation';
import { SYSTEM_ROLES } from '../constants/system-roles';

export function SystemRolesTable() {
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          <TableHead>NAME</TableHead>
          <TableHead>DESCRIPTION</TableHead>
          <TableHead style={{ width: 100 }} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {SYSTEM_ROLES.map((role) => (
          <TableRow
            key={role.key}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/${orgId}/settings/roles/system/${role.key}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/${orgId}/settings/roles/system/${role.key}`);
              }
            }}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <Text size="sm" weight="medium">
                  {role.name}
                </Text>
                <Badge variant="outline">System</Badge>
              </div>
            </TableCell>
            <TableCell>
              <Text size="sm" variant="muted">
                {role.description}
              </Text>
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={<ChevronRight size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${orgId}/settings/roles/system/${role.key}`);
                  }}
                >
                  View
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

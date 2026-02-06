'use client';

import { Skeleton } from '@comp/ui/skeleton';
import {
  HStack,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';

export default function RolesLoading() {
  return (
    <Stack gap="md">
      {/* Toolbar skeleton */}
      <HStack justify="between" align="center" wrap="wrap" gap="3">
        <Skeleton className="h-10 w-full md:max-w-[300px]" />
        <Skeleton className="h-10 w-[120px]" />
      </HStack>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>PERMISSIONS</TableHead>
              <TableHead>CREATED</TableHead>
              <TableHead style={{ width: 80 }}>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Stack>
  );
}

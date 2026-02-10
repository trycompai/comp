'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Edit, OverflowMenuVertical, Search, TrashCan } from '@trycompai/design-system/icons';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRoles } from '../hooks/useRoles';

export interface CustomRole {
  id: string;
  name: string;
  permissions: Record<string, string[]>;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
  };
}

interface RolesTableProps {
  roles: CustomRole[];
}

function ActionsCell({
  role,
}: {
  role: CustomRole;
}) {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const { deleteRole } = useRoles();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const memberCount = role._count?.members || 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRole(role.id);
      toast.success('Role deleted successfully');
      setDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger variant="ellipsis">
          <OverflowMenuVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/${orgId}/settings/roles/${role.id}`)}>
            <Edit size={16} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <TrashCan size={16} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              {memberCount > 0 ? (
                <>
                  This role is currently assigned to <strong>{memberCount}</strong>{' '}
                  {memberCount === 1 ? 'member' : 'members'}. You must reassign or remove
                  these members before deleting this role.
                </>
              ) : (
                <>
                  Are you sure you want to delete the role{' '}
                  <strong>{role.name}</strong>? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || memberCount > 0}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RolesTable({ roles }: RolesTableProps) {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const [search, setSearch] = useState('');

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const lowerSearch = search.toLowerCase();
    return roles.filter((role) => role.name.toLowerCase().includes(lowerSearch));
  }, [roles, search]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPermissionCount = (permissions: Record<string, string[]>) => {
    return Object.keys(permissions).length;
  };

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <HStack justify="between" align="center" wrap="wrap" gap="3">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <Button
          iconLeft={<Add size={16} />}
          onClick={() => router.push(`/${orgId}/settings/roles/new`)}
        >
          Create Role
        </Button>
      </HStack>

      {/* Table */}
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
          {filteredRoles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <div className="flex items-center justify-center py-8">
                  <Text variant="muted">
                    {search ? 'No roles match your search' : 'No custom roles yet'}
                  </Text>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredRoles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {role.name}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {getPermissionCount(role.permissions)} resources
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {formatDate(role.createdAt)}
                  </Text>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <ActionsCell role={role} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}

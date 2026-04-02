'use client';

import { api } from '@/lib/api-client';
import { authClient } from '@/utils/auth-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Login, TrashCan } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INVITE_ROLES = ['admin', 'auditor', 'employee', 'contractor'];

interface OrgMember {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export function MembersTab({
  orgId,
  orgName,
  members,
}: {
  orgId: string;
  orgName: string;
  members: OrgMember[];
}) {
  const router = useRouter();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(
    null,
  );
  const [impersonateTarget, setImpersonateTarget] = useState<OrgMember | null>(
    null,
  );
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    const res = await api.get<PendingInvitation[]>(
      `/v1/admin/organizations/${orgId}/invitations`,
    );
    if (res.data) setInvitations(res.data);
    setLoadingInvitations(false);
  }, [orgId]);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/invite`,
      { email: inviteEmail.trim(), role: inviteRole },
    );
    if (!res.error) {
      setInviteEmail('');
      setInviteRole('employee');
      setShowInviteForm(false);
      void fetchInvitations();
    }
    setInviting(false);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setRevokingId(invitationId);
    const res = await api.delete(
      `/v1/admin/organizations/${orgId}/invitations/${invitationId}`,
    );
    if (!res.error) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    }
    setRevokingId(null);
  };

  const handleRequestImpersonate = (member: OrgMember) => {
    setImpersonateTarget(member);
  };

  const handleConfirmImpersonate = async () => {
    if (!impersonateTarget) return;
    const userId = impersonateTarget.user.id;
    setImpersonateTarget(null);
    setImpersonatingUserId(userId);
    try {
      await authClient.admin.impersonateUser({ userId });
      await authClient.organization.setActive({ organizationId: orgId });
      router.push(`/${orgId}/overview`);
    } catch (err) {
      console.error('Impersonation failed:', err);
      setImpersonatingUserId(null);
    }
  };

  const handleSheetChange = (open: boolean) => {
    setShowInviteForm(open);
    if (!open) {
      setInviteEmail('');
      setInviteRole('employee');
    }
  };

  return (
    <>
      <Stack gap="lg">
        <Section
          title={`Members (${members.length})`}
          actions={
            <Button
              size="sm"
              iconLeft={<Add size={16} />}
              onClick={() => setShowInviteForm(true)}
            >
              Invite Member
            </Button>
          }
        >
          <MembersTable
            members={members}
            impersonatingUserId={impersonatingUserId}
            onImpersonate={handleRequestImpersonate}
          />
        </Section>

        <InvitationsSection
          invitations={invitations}
          loading={loadingInvitations}
          revokingId={revokingId}
          onRevoke={handleRevokeInvitation}
        />
      </Stack>

      <Sheet open={showInviteForm} onOpenChange={handleSheetChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Member to {orgName}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleInvite();
              }}
            >
              <Stack gap="md">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => {
                      if (v) setInviteRole(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  loading={inviting}
                  disabled={!inviteEmail.trim()}
                >
                  Send Invitation
                </Button>
              </Stack>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!impersonateTarget}
        onOpenChange={(open) => {
          if (!open) setImpersonateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate user</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to log in as{' '}
              <strong>{impersonateTarget?.user.name}</strong> (
              {impersonateTarget?.user.email}). All actions you take will be
              performed under their identity and recorded in the audit log with
              your admin session tracked via <em>impersonatedBy</em>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmImpersonate}
            >
              Impersonate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MembersTable({
  members,
  impersonatingUserId,
  onImpersonate,
}: {
  members: OrgMember[];
  impersonatingUserId: string | null;
  onImpersonate: (member: OrgMember) => void;
}) {
  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...members].sort((a, b) => a.user.name.localeCompare(b.user.name)).map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="max-w-[200px] truncate">
                <Text size="sm" weight="medium">
                  {member.user.name}
                </Text>
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-[250px] truncate">
                <Text size="sm" variant="muted">
                  {member.user.email}
                </Text>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {member.role.replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </TableCell>
            <TableCell>
              <Text size="sm" variant="muted">
                {new Date(member.createdAt).toLocaleDateString()}
              </Text>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onImpersonate(member)}
                loading={impersonatingUserId === member.user.id}
                disabled={impersonatingUserId !== null}
                iconLeft={<Login size={16} />}
              >
                Login As
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InvitationsSection({
  invitations,
  loading,
  revokingId,
  onRevoke,
}: {
  invitations: PendingInvitation[];
  loading: boolean;
  revokingId: string | null;
  onRevoke: (id: string) => void;
}) {
  return (
    <Section title={`Pending Invitations (${invitations.length})`}>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No pending invitations.
        </div>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...invitations].sort((a, b) => a.email.localeCompare(b.email)).map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div className="max-w-[250px] truncate">
                    <Text size="sm">{inv.email}</Text>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {inv.role.replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </Text>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRevoke(inv.id)}
                    loading={revokingId === inv.id}
                    iconLeft={<TrashCan size={16} />}
                  >
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

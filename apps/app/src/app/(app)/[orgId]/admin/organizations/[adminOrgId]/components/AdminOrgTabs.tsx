'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
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
  PageHeader,
  PageHeaderDescription,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';
import { OrganizationDetail } from './OrganizationDetail';
import { MembersTab } from './MembersTab';
import { FindingsTab } from './FindingsTab';
import { TasksTab } from './TasksTab';
import { VendorsTab } from './VendorsTab';
import { ContextTab } from './ContextTab';
import { EvidenceTab } from './EvidenceTab';
import { PoliciesTab } from './PoliciesTab';
import { TimelineTab } from './TimelineTab';
import { FeatureFlagsTab } from './FeatureFlagsTab';

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

export interface AdminOrgDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  hasAccess: boolean;
  onboardingCompleted: boolean;
  website: string | null;
  members: OrgMember[];
}

export function AdminOrgTabs({
  org,
  currentOrgId,
}: {
  org: AdminOrgDetail;
  currentOrgId: string;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [toggling, setToggling] = useState(false);
  const [hasAccess, setHasAccess] = useState(org.hasAccess);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');

  const handleToggleAccess = async () => {
    if (hasAccess) {
      setConfirmValue('');
      setDeactivateDialogOpen(true);
      return;
    }
    setToggling(true);
    const res = await api.patch(
      `/v1/admin/organizations/${org.id}/activate`,
    );
    if (!res.error) setHasAccess(true);
    setToggling(false);
  };

  const handleConfirmDeactivate = async () => {
    setDeactivateDialogOpen(false);
    setToggling(true);
    const res = await api.patch(
      `/v1/admin/organizations/${org.id}/deactivate`,
    );
    if (!res.error) setHasAccess(false);
    setToggling(false);
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v); }}>
      <PageLayout
        header={
          <PageHeader
            title={org.name}
            breadcrumbs={[
              {
                label: 'Organizations',
                href: `/${currentOrgId}/admin/organizations`,
              },
              { label: org.name, isCurrent: true },
            ]}
            actions={
              <div className="flex items-center gap-3">
                <Badge variant={hasAccess ? 'default' : 'destructive'}>
                  {hasAccess ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant={hasAccess ? 'destructive' : 'default'}
                  size="sm"
                  onClick={handleToggleAccess}
                  loading={toggling}
                >
                  {hasAccess ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            }
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
              </TabsList>
            }
          >
            {org.website && (
              <PageHeaderDescription>
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  {org.website}
                </a>
              </PageHeaderDescription>
            )}
          </PageHeader>
        }
      >
        <TabsContent value="overview">
          <OrganizationDetail org={org} currentOrgId={currentOrgId} hasAccess={hasAccess} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab
            orgId={org.id}
            orgName={org.name}
            members={org.members}
          />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="findings">
          <FindingsTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorsTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="context">
          <ContextTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="feature-flags">
          <FeatureFlagsTab orgId={org.id} />
        </TabsContent>
      </PageLayout>

      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => {
          setDeactivateDialogOpen(open);
          if (!open) setConfirmValue('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke access for all members of{' '}
              <strong>{org.name}</strong>. They will not be able to log in or
              use the platform until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor="confirm-deactivate">
              Type &apos;deactivate&apos; to confirm
            </Label>
            <Input
              id="confirm-deactivate"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder="deactivate"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmValue('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={confirmValue !== 'deactivate'}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}

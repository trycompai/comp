'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderDescription,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminBillingTab } from './AdminBillingTab';
import { AdminOrgDangerDialogs } from './AdminOrgDangerDialogs';
import { ContextTab } from './ContextTab';
import { EvidenceTab } from './EvidenceTab';
import { FeatureFlagsTab } from './FeatureFlagsTab';
import { FindingsTab } from './FindingsTab';
import { FrameworksTab } from './FrameworksTab';
import { MembersTab } from './MembersTab';
import { OrganizationDetail } from './OrganizationDetail';
import { PoliciesTab } from './PoliciesTab';
import { TasksTab } from './TasksTab';
import { TimelineTab } from './TimelineTab';
import { VendorsTab } from './VendorsTab';

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
  backgroundCheckStepEnabled: boolean;
  members: OrgMember[];
}

const ADMIN_ORG_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'members', label: 'Members' },
  { value: 'policies', label: 'Policies' },
  { value: 'findings', label: 'Findings' },
  { value: 'frameworks', label: 'Frameworks' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'context', label: 'Context' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'billing', label: 'Billing' },
  { value: 'feature-flags', label: 'Feature Flags' },
];

export function AdminOrgTabs({ org, currentOrgId }: { org: AdminOrgDetail; currentOrgId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [toggling, setToggling] = useState(false);
  const [hasAccess, setHasAccess] = useState(org.hasAccess);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleToggleAccess = async () => {
    if (hasAccess) {
      setConfirmValue('');
      setDeactivateDialogOpen(true);
      return;
    }
    setToggling(true);
    const res = await api.patch(`/v1/admin/organizations/${org.id}`, { hasAccess: true });
    if (!res.error) setHasAccess(true);
    setToggling(false);
  };

  const handleConfirmDeactivate = async () => {
    setDeactivateDialogOpen(false);
    setToggling(true);
    const res = await api.patch(`/v1/admin/organizations/${org.id}`, { hasAccess: false });
    if (!res.error) setHasAccess(false);
    setToggling(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const res = await api.delete(`/v1/admin/organizations/${org.id}`, undefined, {
      confirm: org.slug,
    });
    setDeleting(false);
    if (res.error) {
      toast.error(typeof res.error === 'string' ? res.error : 'Failed to delete organization');
      return;
    }
    setDeleteDialogOpen(false);
    toast.success(`Organization '${org.name}' permanently deleted`);
    router.push(`/${currentOrgId}/admin/organizations`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        if (v) setActiveTab(v);
      }}
    >
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
              <div className="flex flex-wrap items-center gap-3">
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteConfirmValue('');
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete Permanently
                </Button>
              </div>
            }
            tabs={
              <div className="w-full">
                <div className="xl:hidden">
                  <Select
                    value={activeTab}
                    onValueChange={(value) => {
                      if (value) setActiveTab(value);
                    }}
                  >
                    <SelectTrigger size="sm">
                      {ADMIN_ORG_TABS.find((tab) => tab.value === activeTab)?.label ?? 'Overview'}
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {ADMIN_ORG_TABS.map((tab) => (
                        <SelectItem key={tab.value} value={tab.value}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden xl:block">
                  <TabsList variant="underline">
                    {ADMIN_ORG_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>
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
          <MembersTab orgId={org.id} orgName={org.name} members={org.members} />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="findings">
          <FindingsTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="frameworks">
          <FrameworksTab orgId={org.id} />
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
        <TabsContent value="billing">
          <AdminBillingTab orgId={org.id} currentOrgId={currentOrgId} />
        </TabsContent>
        <TabsContent value="feature-flags">
          <FeatureFlagsTab orgId={org.id} />
        </TabsContent>
      </PageLayout>

      <AdminOrgDangerDialogs
        orgName={org.name}
        orgSlug={org.slug}
        deactivateOpen={deactivateDialogOpen}
        deleteOpen={deleteDialogOpen}
        confirmValue={confirmValue}
        deleteConfirmValue={deleteConfirmValue}
        deleting={deleting}
        onDeactivateOpenChange={(open) => {
          setDeactivateDialogOpen(open);
          if (!open) setConfirmValue('');
        }}
        onDeleteOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmValue('');
        }}
        onConfirmValueChange={setConfirmValue}
        onDeleteConfirmValueChange={setDeleteConfirmValue}
        onConfirmDeactivate={handleConfirmDeactivate}
        onConfirmDelete={handleConfirmDelete}
      />
    </Tabs>
  );
}

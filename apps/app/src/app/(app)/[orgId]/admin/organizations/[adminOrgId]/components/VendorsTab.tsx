'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Renew } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { VendorForm } from './VendorForm';

interface Vendor {
  id: string;
  name: string;
  website: string | null;
  status: string;
  category: string | null;
  riskLevel: string | null;
  assessmentStatus: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ['not_assessed', 'in_progress', 'assessed'];
const CATEGORY_OPTIONS = [
  'cloud',
  'infrastructure',
  'software_as_a_service',
  'finance',
  'marketing',
  'sales',
  'hr',
  'other',
];

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  not_assessed: 'outline',
  in_progress: 'secondary',
  assessed: 'default',
};

const CATEGORY_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  infrastructure: 'Infrastructure',
  software_as_a_service: 'SaaS',
  finance: 'Finance',
  marketing: 'Marketing',
  sales: 'Sales',
  hr: 'HR',
  other: 'Other',
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function VendorsTab({ orgId }: { orgId: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Vendor[]>(
      `/v1/admin/organizations/${orgId}/vendors`,
    );
    if (res.data) setVendors(res.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const handleFieldChange = async (
    vendorId: string,
    field: string,
    value: string | null,
  ) => {
    setUpdatingId(vendorId);
    const res = await api.patch(
      `/v1/admin/organizations/${orgId}/vendors/${vendorId}`,
      { [field]: value },
    );
    if (!res.error) {
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, [field]: value } : v)),
      );
    }
    setUpdatingId(null);
  };

  const handleTriggerAssessment = async (vendorId: string) => {
    setTriggeringId(vendorId);
    await api.post(
      `/v1/admin/organizations/${orgId}/vendors/${vendorId}/trigger-assessment`,
    );
    setTriggeringId(null);
    void fetchVendors();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading vendors...
      </div>
    );
  }

  const handleCreated = () => {
    setShowForm(false);
    void fetchVendors();
  };

  return (
    <>
    <Section
      title={`Vendors (${vendors.length})`}
      actions={
        <Button
          size="sm"
          iconLeft={<Add size={16} />}
          onClick={() => setShowForm(true)}
        >
          Create Vendor
        </Button>
      }
    >
      {vendors.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No vendors for this organization.
        </div>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...vendors].sort((a, b) => a.name.localeCompare(b.name)).map((vendor) => {
              const isUpdating = updatingId === vendor.id;
              return (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="max-w-[400px]">
                      <div className="truncate">
                        <Text size="sm" weight="medium">
                          {vendor.name}
                        </Text>
                      </div>
                      {vendor.website && (
                        <div className="truncate">
                          <Text size="xs" variant="muted">
                            {vendor.website}
                          </Text>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vendor.category ?? 'other'}
                      onValueChange={(val) => {
                        if (val)
                          void handleFieldChange(vendor.id, 'category', val);
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger size="sm">
                        <span className="text-sm">
                          {CATEGORY_LABELS[vendor.category ?? 'other'] ?? formatLabel(vendor.category ?? 'other')}
                        </span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c] ?? formatLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vendor.status}
                      onValueChange={(val) => {
                        if (val)
                          void handleFieldChange(vendor.id, 'status', val);
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger size="sm">
                        <Badge
                          variant={STATUS_VARIANT[vendor.status] ?? 'outline'}
                        >
                          {formatLabel(vendor.status)}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      iconLeft={<Renew size={16} />}
                      onClick={() => handleTriggerAssessment(vendor.id)}
                      loading={triggeringId === vendor.id}
                      disabled={triggeringId === vendor.id}
                    >
                      Regenerate
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section>

    <Sheet open={showForm} onOpenChange={setShowForm}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Vendor</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <VendorForm orgId={orgId} onCreated={handleCreated} />
        </SheetBody>
      </SheetContent>
    </Sheet>
    </>
  );
}

'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  type McpOrganizationData,
  useMcpOrganization,
} from '../hooks/useMcpOrganization';

interface Props {
  initialData: McpOrganizationData;
}

export function McpOrganizationSelector({ initialData }: Props) {
  const { data, saveOrganization } = useMcpOrganization({ initialData });
  const organizations = data?.organizations ?? [];
  const savedOrgId = data?.selectedOrganizationId ?? null;

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(savedOrgId);
  const [saving, setSaving] = useState(false);

  // Only relevant for users who belong to more than one organization —
  // single-org users always act on their one org automatically.
  if (organizations.length <= 1) {
    return null;
  }

  const handleSave = async () => {
    if (!selectedOrgId) {
      toast.error('Select an organization first.');
      return;
    }
    setSaving(true);
    try {
      await saveOrganization(selectedOrgId);
      toast.success('AI / MCP organization updated.');
    } catch {
      toast.error('Failed to update organization. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="AI / MCP organization"
      description="You belong to more than one organization. Choose which one your AI assistant (MCP) connection acts on. Changes take effect on your next AI request — no need to reconnect."
      actions={
        <Button
          onClick={handleSave}
          disabled={saving || !selectedOrgId || selectedOrgId === savedOrgId}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <div className="space-y-3">
        {!savedOrgId ? (
          <Alert variant="warning">
            <AlertDescription>
              Pick an organization to start using your AI assistant. Until you
              choose one, AI / MCP requests can&apos;t act on your data.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="max-w-sm">
          <Select
            value={selectedOrgId ?? ''}
            onValueChange={setSelectedOrgId}
            disabled={saving}
          >
            <SelectTrigger id="mcp-org-select">
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent align="start">
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Section>
  );
}

'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import { View, ViewOff } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TrustPortalQuestionnaireProps {
  initialEnabled: boolean;
  orgId: string;
}

export function TrustPortalQuestionnaire({ initialEnabled, orgId }: TrustPortalQuestionnaireProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('trust', 'update');
  const { updateSecurityQuestionnaireEnabled } = useTrustPortalSettings();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  // Resync when the server-provided value changes (e.g. parent refetch), so the
  // toggle never reflects stale visibility.
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  const handleToggleChange = async (checked: boolean) => {
    if (!canUpdate || checked === enabled || isSaving) return;
    // Optimistically flip, revert if the save fails.
    const previous = enabled;
    setEnabled(checked);
    setIsSaving(true);
    try {
      await updateSecurityQuestionnaireEnabled(checked);
      toast.success(
        checked
          ? 'Security Questionnaire is now visible on your trust portal'
          : 'Security Questionnaire is now hidden from your trust portal',
      );
    } catch {
      setEnabled(previous);
      toast.error('Failed to update Security Questionnaire visibility');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visibility Toggle */}
      <div className="flex justify-start">
        <div className="inline-flex rounded-md overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => handleToggleChange(true)}
            disabled={!canUpdate || isSaving}
            aria-pressed={enabled}
            className={`flex items-center gap-1 px-2 py-1 font-medium transition-colors ${canUpdate ? 'cursor-pointer' : 'cursor-default opacity-70'} ${
              enabled
                ? 'bg-primary/10 text-primary dark:brightness-175'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <View size={12} />
            Visible
          </button>
          <button
            type="button"
            onClick={() => handleToggleChange(false)}
            disabled={!canUpdate || isSaving}
            aria-pressed={!enabled}
            className={`flex items-center gap-1 px-2 py-1 font-medium transition-colors ${canUpdate ? 'cursor-pointer' : 'cursor-default opacity-70'} ${
              !enabled
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <ViewOff size={12} />
            Hidden
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Security Questionnaire</h3>
        <p className="text-sm text-muted-foreground">
          When visible, visitors to your public trust portal can submit a security questionnaire and
          receive AI-assisted answers drawn from your policy library.
        </p>
        <p className="text-sm text-muted-foreground">
          Hide it if you'd rather review answers before they reach customers — hiding removes the
          questionnaire button from your trust portal and the questionnaire tab from the access
          area, so questionnaires can no longer be started from the portal.
        </p>
      </div>
    </div>
  );
}

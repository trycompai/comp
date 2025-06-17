import { updateIntegrationSettingsAction } from '@/actions/integrations/update-integration-settings-action';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Switch } from '@comp/ui/switch';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

export type IntegrationSettingsItem = {
  id: string;
  label: string;
  description: string;
  type: 'switch' | 'text' | 'select';
  required: boolean;
  value: string | boolean;
  placeholder?: string;
  isSet?: boolean;
};

function IntegrationSettingsItem({
  setting,
  integrationId,
  onSettingChange,
  installedSettings,
}: {
  setting: IntegrationSettingsItem;
  integrationId: string;
  installedSettings: Record<string, any>;
  onSettingChange: (id: string, value: string | boolean) => void;
}) {
  switch (setting.type) {
    case 'switch':
      return (
        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <Label className="text-muted-foreground">{setting.label}</Label>
            <p className="text-muted-foreground text-xs">{setting.description}</p>
          </div>
          <Switch
            checked={Boolean(setting.value)}
            onCheckedChange={(checked) => {
              onSettingChange(setting.id, Boolean(checked));
            }}
          />
        </div>
      );
    case 'text':
      return (
        <div className="flex flex-col justify-between gap-2">
          <div className="space-y-1 pr-4">
            <Label className="text-muted-foreground flex items-center gap-1">{setting.label}</Label>
            <p className="text-muted-foreground text-xs">{setting.description}</p>
          </div>
          <Input
            type={installedSettings[setting.id] ? 'password' : 'text'}
            value={setting.value as string}
            placeholder={installedSettings[setting.id] ? '••••••••' : setting.placeholder}
            onChange={(e) => {
              onSettingChange(setting.id, e.target.value);
            }}
          />
        </div>
      );
    default:
      return null;
  }
}

export function IntegrationSettings({
  settings,
  integrationId,
  installedSettings,
}: {
  settings?: IntegrationSettingsItem[] | Record<string, any>;
  integrationId: string;
  installedSettings: Record<string, any>;
}) {
  const updateIntegrationSettings = useAction(updateIntegrationSettingsAction, {
    onSuccess: () => {
      toast.success('Settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  // Convert non-array settings to array format if needed
  const normalizedSettings = Array.isArray(settings)
    ? settings
    : settings
      ? Object.entries(settings).map(([key, value]) => ({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          description: `Enter your ${key.replace(/_/g, ' ')}`,
          type: 'text',
          required: true,
          value: value,
          placeholder: `Enter your ${key.replace(/_/g, ' ')}`,
        }))
      : [];

  const [localSettings, setLocalSettings] = useState(normalizedSettings);

  const handleSettingChange = (id: string, value: string | boolean) => {
    setLocalSettings((prevSettings) =>
      prevSettings?.map((setting) => (setting.id === id ? { ...setting, value } : setting)),
    );
  };

  const handleSave = () => {
    if (!localSettings || localSettings.length === 0) {
      return;
    }

    for (const setting of localSettings) {
      updateIntegrationSettings.execute({
        integration_id: integrationId,
        option: { id: setting.id, value: setting.value },
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {localSettings.length === 0 ? (
        <p className="text-muted-foreground text-sm">No settings available</p>
      ) : (
        localSettings.map((setting) => (
          <div key={setting.id} className="my-2 flex flex-col">
            <IntegrationSettingsItem
              setting={setting}
              integrationId={integrationId}
              installedSettings={installedSettings}
              onSettingChange={handleSettingChange}
            />
          </div>
        ))
      )}

      {localSettings.length > 0 && (
        <Button onClick={handleSave} disabled={updateIntegrationSettings.isPending}>
          {updateIntegrationSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Save settings'
          )}
        </Button>
      )}
    </div>
  );
}

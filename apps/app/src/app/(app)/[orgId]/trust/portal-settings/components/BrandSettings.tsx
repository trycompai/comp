'use client';

import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/use-permissions';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@trycompai/design-system';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const trustSettingsSchema = z.object({
  primaryColor: z.string().optional(),
});

interface BrandSettingsProps {
  orgId: string;
  primaryColor: string | null;
}

export function BrandSettings({
  orgId,
  primaryColor,
}: BrandSettingsProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('trust', 'update');
  const { updateToggleSettings } = useTrustPortalSettings();

  const form = useForm<z.infer<typeof trustSettingsSchema>>({
    resolver: zodResolver(trustSettingsSchema),
    defaultValues: {
      primaryColor: primaryColor ?? undefined,
    },
  });

  const lastSaved = useRef<{ [key: string]: string | null }>({
    primaryColor: primaryColor ?? null,
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    primaryColor: false,
  });

  const autoSave = useCallback(
    async (field: string, value: unknown) => {
      if (savingRef.current[field]) {
        return;
      }

      if (lastSaved.current[field] !== value) {
        savingRef.current[field] = true;
        try {
          await updateToggleSettings({
            enabled: true,
            primaryColor:
              field === 'primaryColor' ? (value as string) : (form.getValues('primaryColor') ?? undefined),
          });
          toast.success('Brand settings updated');
          lastSaved.current[field] = value as string | null;
        } catch {
          toast.error('Failed to update brand settings');
        } finally {
          savingRef.current[field] = false;
        }
      }
    },
    [form, updateToggleSettings],
  );

  const [primaryColorValue, setPrimaryColorValue] = useState(form.getValues('primaryColor') || '');
  const debouncedPrimaryColor = useDebounce(primaryColorValue, 800);

  useEffect(() => {
    if (
      debouncedPrimaryColor !== undefined &&
      debouncedPrimaryColor !== lastSaved.current.primaryColor &&
      !savingRef.current.primaryColor
    ) {
      form.setValue('primaryColor', debouncedPrimaryColor || undefined);
      void autoSave('primaryColor', debouncedPrimaryColor || null);
    }
  }, [debouncedPrimaryColor, autoSave, form]);

  const handlePrimaryColorBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        form.setValue('primaryColor', value);
      }
      void autoSave('primaryColor', value || null);
    },
    [form, autoSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Settings</CardTitle>
        <CardDescription>Customize the appearance of your trust portal</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Brand Color</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            {...field}
                            value={primaryColorValue ?? '#000000'}
                            onChange={(e) => {
                              field.onChange(e);
                              setPrimaryColorValue(e.target.value);
                            }}
                            onBlur={handlePrimaryColorBlur}
                            type="color"
                            className="sr-only"
                            id="color-picker"
                            disabled={!canUpdate}
                          />
                          <label
                            htmlFor="color-picker"
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-border shadow-sm transition-all hover:scale-105 hover:shadow-md"
                            style={{ backgroundColor: primaryColorValue || '#000000' }}
                          >
                            <span className="sr-only">Pick a color</span>
                          </label>
                        </div>
                        <div className="flex-1">
                          <div className="font-mono">
                            <Input
                              value={primaryColorValue?.toUpperCase() || '#000000'}
                              onChange={(e) => {
                                let value = e.target.value;
                                if (!value.startsWith('#')) {
                                  value = '#' + value;
                                }
                                field.onChange(value);
                                setPrimaryColorValue(value);
                              }}
                              onBlur={handlePrimaryColorBlur}
                              placeholder="#000000"
                              maxLength={7}
                              disabled={!canUpdate}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Used for branding across your trust portal
            </p>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

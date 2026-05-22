'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import { useDebounce } from '@/hooks/useDebounce';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const DEFAULT_PRIMARY_COLOR = '#000000';
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const trustSettingsSchema = z.object({
  primaryColor: z.string().regex(HEX_COLOR_PATTERN, 'Enter a valid hex color').optional(),
});

interface BrandSettingsProps {
  enabled?: boolean;
  primaryColor: string | null;
  onPrimaryColorChange?: (primaryColor: string | null) => void;
}

function normalizePrimaryColor(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (!HEX_COLOR_PATTERN.test(value)) return null;
  return value.toUpperCase();
}

export function BrandSettings({
  enabled = true,
  primaryColor,
  onPrimaryColorChange,
}: BrandSettingsProps) {
  const router = useRouter();
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
    primaryColor: normalizePrimaryColor(primaryColor),
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    primaryColor: false,
  });

  const autoSave = useCallback(
    async (field: string, value: unknown) => {
      if (savingRef.current[field]) {
        return;
      }

      const nextPrimaryColor = normalizePrimaryColor(value);
      if (!nextPrimaryColor) {
        return;
      }

      if (lastSaved.current[field] !== nextPrimaryColor) {
        savingRef.current[field] = true;
        try {
          await updateToggleSettings({
            enabled,
            primaryColor:
              field === 'primaryColor'
                ? nextPrimaryColor
                : (form.getValues('primaryColor') ?? undefined),
          });
          toast.success('Brand settings updated');
          lastSaved.current[field] = nextPrimaryColor;
          onPrimaryColorChange?.(nextPrimaryColor);
          router.refresh();
        } catch {
          toast.error('Failed to update brand settings');
        } finally {
          savingRef.current[field] = false;
        }
      }
    },
    [enabled, form, onPrimaryColorChange, router, updateToggleSettings],
  );

  const [primaryColorValue, setPrimaryColorValue] = useState(form.getValues('primaryColor') || '');
  const debouncedPrimaryColor = useDebounce(primaryColorValue, 800);

  useEffect(() => {
    const normalizedPrimaryColor = normalizePrimaryColor(primaryColor);
    form.reset({ primaryColor: normalizedPrimaryColor ?? undefined });
    setPrimaryColorValue(normalizedPrimaryColor ?? '');
    lastSaved.current.primaryColor = normalizedPrimaryColor;
  }, [form, primaryColor]);

  useEffect(() => {
    if (
      debouncedPrimaryColor !== undefined &&
      normalizePrimaryColor(debouncedPrimaryColor) !== lastSaved.current.primaryColor &&
      !savingRef.current.primaryColor
    ) {
      const normalizedPrimaryColor = normalizePrimaryColor(debouncedPrimaryColor);
      if (normalizedPrimaryColor) {
        form.setValue('primaryColor', normalizedPrimaryColor);
        void autoSave('primaryColor', normalizedPrimaryColor);
      }
    }
  }, [debouncedPrimaryColor, autoSave, form]);

  const handlePrimaryColorBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = normalizePrimaryColor(e.target.value);
      if (!value) {
        toast.error('Enter a valid hex color');
        return;
      }
      form.setValue('primaryColor', value);
      setPrimaryColorValue(value);
      void autoSave('primaryColor', value);
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
        <div className="space-y-4">
          <Controller
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="color-picker">Brand Color</FieldLabel>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        {...field}
                        value={normalizePrimaryColor(primaryColorValue) ?? DEFAULT_PRIMARY_COLOR}
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
                        style={{
                          backgroundColor:
                            normalizePrimaryColor(primaryColorValue) ?? DEFAULT_PRIMARY_COLOR,
                        }}
                      >
                        <span className="sr-only">Pick a color</span>
                      </label>
                    </div>
                    <div className="flex-1">
                      <div className="font-mono">
                        <Input
                          value={primaryColorValue?.toUpperCase() || DEFAULT_PRIMARY_COLOR}
                          onChange={(e) => {
                            let value = e.target.value;
                            if (value.length > 0 && !value.startsWith('#')) {
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
              </Field>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Used for branding across your trust portal
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

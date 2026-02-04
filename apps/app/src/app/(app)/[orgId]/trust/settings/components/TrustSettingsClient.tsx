'use client';

import { useDebounce } from '@/hooks/useDebounce';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AllowedDomainsManager } from '../../portal-settings/components/AllowedDomainsManager';
import { TrustPortalDomain } from '../../portal-settings/components/TrustPortalDomain';

const trustSettingsSchema = z.object({
  contactEmail: z.string().email().or(z.literal('')).optional(),
  primaryColor: z.string().optional(),
});

interface TrustSettingsClientProps {
  orgId: string;
  contactEmail: string | null;
  primaryColor: string | null;
  domain: string;
  domainVerified: boolean;
  isVercelDomain: boolean;
  vercelVerification: string | null;
  allowedDomains: string[];
}

export function TrustSettingsClient({
  orgId,
  contactEmail,
  primaryColor,
  domain,
  domainVerified,
  isVercelDomain,
  vercelVerification,
  allowedDomains,
}: TrustSettingsClientProps) {
  const api = useApi();

  const form = useForm<z.infer<typeof trustSettingsSchema>>({
    resolver: zodResolver(trustSettingsSchema),
    defaultValues: {
      contactEmail: contactEmail ?? undefined,
      primaryColor: primaryColor ?? undefined,
    },
  });

  const lastSaved = useRef<{ [key: string]: string | null }>({
    contactEmail: contactEmail ?? '',
    primaryColor: primaryColor ?? null,
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    contactEmail: false,
    primaryColor: false,
  });

  const autoSave = useCallback(
    async (field: string, value: unknown) => {
      if (savingRef.current[field]) {
        return;
      }

      const current = form.getValues();
      if (lastSaved.current[field] !== value) {
        savingRef.current[field] = true;
        try {
          const data = {
            enabled: true, // Settings page assumes portal is enabled
            contactEmail:
              field === 'contactEmail' ? (value as string) : (current.contactEmail ?? ''),
            primaryColor:
              field === 'primaryColor' ? (value as string) : (current.primaryColor ?? undefined),
          };
          const response = await api.put('/v1/trust-portal/settings/toggle', data);
          if (response.error) {
            toast.error('Failed to update trust settings');
          } else {
            toast.success('Trust settings updated');
          }
          lastSaved.current[field] = value as string | null;
        } finally {
          savingRef.current[field] = false;
        }
      }
    },
    [form, api],
  );

  const [contactEmailValue, setContactEmailValue] = useState(form.getValues('contactEmail') || '');
  const debouncedContactEmail = useDebounce(contactEmailValue, 800);

  const [primaryColorValue, setPrimaryColorValue] = useState(form.getValues('primaryColor') || '');
  const debouncedPrimaryColor = useDebounce(primaryColorValue, 800);

  useEffect(() => {
    if (
      debouncedContactEmail !== undefined &&
      debouncedContactEmail !== lastSaved.current.contactEmail &&
      !savingRef.current.contactEmail
    ) {
      form.setValue('contactEmail', debouncedContactEmail);
      void autoSave('contactEmail', debouncedContactEmail);
    }
  }, [debouncedContactEmail, autoSave, form]);

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

  const handleContactEmailBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      form.setValue('contactEmail', value);
      autoSave('contactEmail', value);
    },
    [form, autoSave],
  );

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
    <div className="space-y-6">
      {/* Brand Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Settings</CardTitle>
          <CardDescription>Customize the appearance of your trust portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 lg:grid-cols-2">
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
                                className="font-mono"
                                maxLength={7}
                              />
                            </div>
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={contactEmailValue}
                          onChange={(e) => {
                            field.onChange(e);
                            setContactEmailValue(e.target.value);
                          }}
                          onBlur={handleContactEmailBlur}
                          placeholder="contact@example.com"
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck="false"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for branding across your trust portal
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <TrustPortalDomain
        domain={domain}
        domainVerified={domainVerified}
        orgId={orgId}
        isVercelDomain={isVercelDomain}
        vercelVerification={vercelVerification}
      />

      {/* Allowed Domains */}
      <AllowedDomainsManager initialDomains={allowedDomains} orgId={orgId} />
    </div>
  );
}

'use client';

import { useDebounce } from '@/hooks/useDebounce';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
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
});

interface TrustSettingsClientProps {
  orgId: string;
  contactEmail: string | null;
  domain: string;
  domainVerified: boolean;
  isVercelDomain: boolean;
  vercelVerification: string | null;
  allowedDomains: string[];
}

export function TrustSettingsClient({
  orgId,
  contactEmail,
  domain,
  domainVerified,
  isVercelDomain,
  vercelVerification,
  allowedDomains,
}: TrustSettingsClientProps) {
  const { updateToggleSettings } = useTrustPortalSettings();

  const form = useForm<z.infer<typeof trustSettingsSchema>>({
    resolver: zodResolver(trustSettingsSchema),
    defaultValues: {
      contactEmail: contactEmail ?? undefined,
    },
  });

  const lastSaved = useRef<{ [key: string]: string | null }>({
    contactEmail: contactEmail ?? '',
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    contactEmail: false,
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
          await updateToggleSettings({
            enabled: true, // Settings page assumes portal is enabled
            contactEmail:
              field === 'contactEmail' ? (value as string) : (current.contactEmail ?? ''),
          });
          toast.success('Trust settings updated');
          lastSaved.current[field] = value as string | null;
        } catch {
          toast.error('Failed to update trust settings');
        } finally {
          savingRef.current[field] = false;
        }
      }
    },
    [form, updateToggleSettings],
  );

  const [contactEmailValue, setContactEmailValue] = useState(form.getValues('contactEmail') || '');
  const debouncedContactEmail = useDebounce(contactEmailValue, 800);

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

  const handleContactEmailBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      form.setValue('contactEmail', value);
      autoSave('contactEmail', value);
    },
    [form, autoSave],
  );

  return (
    <div className="space-y-6">
      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Manage contact details for your trust portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                This email will be displayed on your trust portal for visitors to contact you
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

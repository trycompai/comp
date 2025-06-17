'use client';

import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Switch } from '@comp/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { isFriendlyAvailable } from '../actions/is-friendly-available';
import { trustPortalSwitchAction } from '../actions/trust-portal-switch';
import { updateTrustPortalFrameworks } from '../actions/update-trust-portal-frameworks';
import { GDPR, ISO27001, SOC2 } from './logos';

const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  friendlyUrl: z.string().optional(),
  soc2: z.boolean(),
  iso27001: z.boolean(),
  gdpr: z.boolean(),
  soc2Status: z.enum(['started', 'in_progress', 'compliant']),
  iso27001Status: z.enum(['started', 'in_progress', 'compliant']),
  gdprStatus: z.enum(['started', 'in_progress', 'compliant']),
});

export function TrustPortalSwitch({
  enabled,
  slug,
  domainVerified,
  domain,
  contactEmail,
  orgId,
  soc2,
  iso27001,
  gdpr,
  soc2Status,
  iso27001Status,
  gdprStatus,
  friendlyUrl,
}: {
  enabled: boolean;
  slug: string;
  domainVerified: boolean;
  domain: string;
  contactEmail: string | null;
  orgId: string;
  soc2: boolean;
  iso27001: boolean;
  gdpr: boolean;
  soc2Status: 'started' | 'in_progress' | 'compliant';
  iso27001Status: 'started' | 'in_progress' | 'compliant';
  gdprStatus: 'started' | 'in_progress' | 'compliant';
  friendlyUrl: string | null;
}) {
  const trustPortalSwitch = useAction(trustPortalSwitchAction, {
    onSuccess: () => {
      toast.success('Trust portal status updated');
    },
    onError: () => {
      toast.error('Failed to update trust portal status');
    },
  });

  const checkFriendlyUrl = useAction(isFriendlyAvailable);

  const form = useForm<z.infer<typeof trustPortalSwitchSchema>>({
    resolver: zodResolver(trustPortalSwitchSchema),
    defaultValues: {
      enabled: enabled,
      contactEmail: contactEmail ?? undefined,
      soc2: soc2 ?? false,
      iso27001: iso27001 ?? false,
      gdpr: gdpr ?? false,
      soc2Status: soc2Status ?? 'started',
      iso27001Status: iso27001Status ?? 'started',
      gdprStatus: gdprStatus ?? 'started',
      friendlyUrl: friendlyUrl ?? undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof trustPortalSwitchSchema>) => {
    await trustPortalSwitch.execute(data);
  };

  const portalUrl = domainVerified ? `https://${domain}` : `https://trust.inc/${slug}`;

  const lastSaved = useRef<{ [key: string]: string | boolean }>({
    contactEmail: contactEmail ?? '',
    friendlyUrl: friendlyUrl ?? '',
    enabled: enabled,
  });

  const autoSave = useCallback(
    async (field: string, value: any) => {
      const current = form.getValues();
      if (lastSaved.current[field] !== value) {
        const data = { ...current, [field]: value };
        await onSubmit(data);
        lastSaved.current[field] = value;
      }
    },
    [form, onSubmit],
  );

  const [contactEmailValue, setContactEmailValue] = useState(form.getValues('contactEmail') || '');
  const debouncedContactEmail = useDebounce(contactEmailValue, 500);

  useEffect(() => {
    if (
      debouncedContactEmail !== undefined &&
      debouncedContactEmail !== lastSaved.current.contactEmail
    ) {
      form.setValue('contactEmail', debouncedContactEmail);
      autoSave('contactEmail', debouncedContactEmail);
    }
  }, [debouncedContactEmail]);

  const handleContactEmailBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      form.setValue('contactEmail', value);
      autoSave('contactEmail', value);
    },
    [form, autoSave],
  );

  const [friendlyUrlValue, setFriendlyUrlValue] = useState(form.getValues('friendlyUrl') || '');
  const debouncedFriendlyUrl = useDebounce(friendlyUrlValue, 500);
  const [friendlyUrlStatus, setFriendlyUrlStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');

  useEffect(() => {
    if (!debouncedFriendlyUrl || debouncedFriendlyUrl === (friendlyUrl ?? '')) {
      setFriendlyUrlStatus('idle');
      return;
    }
    setFriendlyUrlStatus('checking');
    checkFriendlyUrl.execute({ friendlyUrl: debouncedFriendlyUrl, orgId });
  }, [debouncedFriendlyUrl, orgId, friendlyUrl]);
  useEffect(() => {
    if (checkFriendlyUrl.status === 'executing') return;
    if (checkFriendlyUrl.result?.data?.isAvailable === true) {
      setFriendlyUrlStatus('available');

      if (debouncedFriendlyUrl !== lastSaved.current.friendlyUrl) {
        form.setValue('friendlyUrl', debouncedFriendlyUrl);
        autoSave('friendlyUrl', debouncedFriendlyUrl);
      }
    } else if (checkFriendlyUrl.result?.data?.isAvailable === false) {
      setFriendlyUrlStatus('unavailable');
    }
  }, [checkFriendlyUrl.status, checkFriendlyUrl.result]);

  const handleFriendlyUrlBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (friendlyUrlStatus === 'available' && value !== lastSaved.current.friendlyUrl) {
        form.setValue('friendlyUrl', value);
        autoSave('friendlyUrl', value);
      }
    },
    [form, autoSave, friendlyUrlStatus],
  );

  const handleEnabledChange = useCallback(
    (val: boolean) => {
      form.setValue('enabled', val);
      autoSave('enabled', val);
    },
    [form, autoSave],
  );

  return (
    <Form {...form}>
      <form className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Trust Portal
                  <Link
                    href={portalUrl}
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Create a public trust portal for your organization.
                </p>
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleEnabledChange}
                        disabled={trustPortalSwitch.status === 'executing'}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            {form.watch('enabled') && (
              <div className="pt-2">
                <h3 className="mb-4 text-sm font-medium">Trust Portal Settings</h3>
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="friendlyUrl"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Custom URL</FormLabel>
                        <FormControl>
                          <div>
                            <div className="relative flex w-full items-center">
                              <Input
                                {...field}
                                value={friendlyUrlValue}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setFriendlyUrlValue(e.target.value);
                                }}
                                onBlur={handleFriendlyUrlBlur}
                                placeholder="my-org"
                                autoComplete="off"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                prefix="trust.inc/"
                              />
                            </div>
                            {friendlyUrlValue && (
                              <div className="mt-1 min-h-[18px] text-xs">
                                {friendlyUrlStatus === 'checking' && 'Checking availability...'}
                                {friendlyUrlStatus === 'available' && (
                                  <span className="text-green-600">{'This URL is available!'}</span>
                                )}
                                {friendlyUrlStatus === 'unavailable' && (
                                  <span className="text-red-600">
                                    {'This URL is already taken.'}
                                  </span>
                                )}
                              </div>
                            )}
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
                            className="w-auto"
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
              </div>
            )}
            {form.watch('enabled') && (
              <div className="">
                {/* Compliance Frameworks Section */}
                <div>
                  <h3 className="mb-2 text-sm font-medium">Compliance Frameworks</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Share the frameworks your organization is compliant with or working towards.
                  </p>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {/* SOC 2 */}
                    <ComplianceFramework
                      title="SOC 2"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={soc2}
                      status={soc2Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('SOC 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2: checked,
                          });
                          toast.success('SOC 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 status');
                        }
                      }}
                    />
                    {/* ISO 27001 */}
                    <ComplianceFramework
                      title="ISO 27001"
                      description="An international standard for managing information security systems."
                      isEnabled={iso27001}
                      status={iso27001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso27001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 27001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 27001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso27001: checked,
                          });
                          toast.success('ISO 27001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 27001 status');
                        }
                      }}
                    />
                    {/* GDPR */}
                    <ComplianceFramework
                      title="GDPR"
                      description="A European regulation that governs personal data protection and user privacy."
                      isEnabled={gdpr}
                      status={gdprStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            gdprStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('GDPR status updated');
                        } catch (error) {
                          toast.error('Failed to update GDPR status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            gdpr: checked,
                          });
                          toast.success('GDPR status updated');
                        } catch (error) {
                          toast.error('Failed to update GDPR status');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

// Extracted component for compliance frameworks to reduce repetition and improve readability
function ComplianceFramework({
  title,
  description,
  isEnabled,
  status,
  onStatusChange,
  onToggle,
}: {
  title: string;
  description: string;
  isEnabled: boolean;
  status: string;
  onStatusChange: (value: string) => Promise<void>;
  onToggle: (checked: boolean) => Promise<void>;
}) {
  const logo =
    title === 'SOC 2' ? (
      <SOC2 className="h-16 w-16" />
    ) : title === 'ISO 27001' ? (
      <ISO27001 className="h-16 w-16" />
    ) : (
      <GDPR className="h-16 w-16" />
    );

  return (
    <>
      <Card className="rounded-lg border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <div className="shrink-0">{logo}</div>
            <div>
              <CardTitle className="text-lg leading-tight font-semibold">{title}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 line-clamp-3 text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="mt-4 border-t" />
        <CardContent className="pt-4">
          <div className="flex flex-row items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              {isEnabled ? (
                <Select defaultValue={status} onValueChange={onStatusChange}>
                  <SelectTrigger className="min-w-[180px] text-base font-medium">
                    <SelectValue placeholder="Select status" className="w-auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="started">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-gray-300" />
                        Started
                      </span>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-yellow-400" />
                        In Progress
                      </span>
                    </SelectItem>
                    <SelectItem value="compliant">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-green-500" />
                        Compliant
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Disabled</span>
                </div>
              )}
            </div>
            <div className="shrink-0 pl-2">
              <Switch checked={isEnabled} onCheckedChange={onToggle} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

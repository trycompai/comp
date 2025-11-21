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
import {
  GDPR,
  HIPAA,
  ISO27001,
  ISO42001,
  ISO9001,
  NEN7510,
  PCIDSS,
  SOC2Type1,
  SOC2Type2,
} from './logos';

const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  friendlyUrl: z.string().optional(),
  soc2type1: z.boolean(),
  soc2type2: z.boolean(),
  iso27001: z.boolean(),
  iso42001: z.boolean(),
  gdpr: z.boolean(),
  hipaa: z.boolean(),
  pcidss: z.boolean(),
  nen7510: z.boolean(),
  iso9001: z.boolean(),
  soc2type1Status: z.enum(['started', 'in_progress', 'compliant']),
  soc2type2Status: z.enum(['started', 'in_progress', 'compliant']),
  iso27001Status: z.enum(['started', 'in_progress', 'compliant']),
  iso42001Status: z.enum(['started', 'in_progress', 'compliant']),
  gdprStatus: z.enum(['started', 'in_progress', 'compliant']),
  hipaaStatus: z.enum(['started', 'in_progress', 'compliant']),
  pcidssStatus: z.enum(['started', 'in_progress', 'compliant']),
  nen7510Status: z.enum(['started', 'in_progress', 'compliant']),
  iso9001Status: z.enum(['started', 'in_progress', 'compliant']),
});

export function TrustPortalSwitch({
  enabled,
  slug,
  domainVerified,
  domain,
  contactEmail,
  orgId,
  soc2type1,
  soc2type2,
  iso27001,
  iso42001,
  gdpr,
  hipaa,
  pcidss,
  soc2type1Status,
  soc2type2Status,
  iso27001Status,
  iso42001Status,
  gdprStatus,
  hipaaStatus,
  pcidssStatus,
  nen7510,
  nen7510Status,
  iso9001,
  iso9001Status,
  friendlyUrl,
}: {
  enabled: boolean;
  slug: string;
  domainVerified: boolean;
  domain: string;
  contactEmail: string | null;
  orgId: string;
  soc2type1: boolean;
  soc2type2: boolean;
  iso27001: boolean;
  iso42001: boolean;
  gdpr: boolean;
  hipaa: boolean;
  pcidss: boolean;
  nen7510: boolean;
  soc2type1Status: 'started' | 'in_progress' | 'compliant';
  soc2type2Status: 'started' | 'in_progress' | 'compliant';
  iso27001Status: 'started' | 'in_progress' | 'compliant';
  iso42001Status: 'started' | 'in_progress' | 'compliant';
  gdprStatus: 'started' | 'in_progress' | 'compliant';
  hipaaStatus: 'started' | 'in_progress' | 'compliant';
  pcidssStatus: 'started' | 'in_progress' | 'compliant';
  nen7510Status: 'started' | 'in_progress' | 'compliant';
  iso9001: boolean;
  iso9001Status: 'started' | 'in_progress' | 'compliant';
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
      soc2type1: soc2type1 ?? false,
      soc2type2: soc2type2 ?? false,
      iso27001: iso27001 ?? false,
      iso42001: iso42001 ?? false,
      gdpr: gdpr ?? false,
      hipaa: hipaa ?? false,
      pcidss: pcidss ?? false,
      nen7510: nen7510 ?? false,
      iso9001: iso9001 ?? false,
      soc2type1Status: soc2type1Status ?? 'started',
      soc2type2Status: soc2type2Status ?? 'started',
      iso27001Status: iso27001Status ?? 'started',
      iso42001Status: iso42001Status ?? 'started',
      gdprStatus: gdprStatus ?? 'started',
      hipaaStatus: hipaaStatus ?? 'started',
      pcidssStatus: pcidssStatus ?? 'started',
      nen7510Status: nen7510Status ?? 'started',
      iso9001Status: iso9001Status ?? 'started',
      friendlyUrl: friendlyUrl ?? undefined,
    },
  });

  const onSubmit = useCallback(
    async (data: z.infer<typeof trustPortalSwitchSchema>) => {
      await trustPortalSwitch.execute(data);
    },
    [], // Remove trustPortalSwitch from dependencies to prevent infinite loop
  );

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
  }, [debouncedContactEmail, autoSave, form]);

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
  }, [checkFriendlyUrl.status, checkFriendlyUrl.result, debouncedFriendlyUrl, form, autoSave]);

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
                    {/* ISO 42001 */}
                    <ComplianceFramework
                      title="ISO 42001"
                      description="An international standard for an Artificial Intelligence Management System."
                      isEnabled={iso42001}
                      status={iso42001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso42001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 42001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 42001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso42001: checked,
                          });
                          toast.success('ISO 42001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 42001 status');
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
                    {/* HIPAA */}
                    <ComplianceFramework
                      title="HIPAA"
                      description="A US regulation that protects sensitive patient health information and medical data."
                      isEnabled={hipaa}
                      status={hipaaStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            hipaaStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('HIPAA status updated');
                        } catch (error) {
                          toast.error('Failed to update HIPAA status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            hipaa: checked,
                          });
                          toast.success('HIPAA status updated');
                        } catch (error) {
                          toast.error('Failed to update HIPAA status');
                        }
                      }}
                    />
                    {/* SOC 2 Type 1*/}
                    <ComplianceFramework
                      title="SOC 2 Type 1"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={soc2type1}
                      status={soc2type1Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type1Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('SOC 2 Type 1 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 1 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type1: checked,
                          });
                          toast.success('SOC 2 Type 1 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 1 status');
                        }
                      }}
                    />
                    {/* SOC 2 Type 2*/}
                    <ComplianceFramework
                      title="SOC 2 Type 2"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={soc2type2}
                      status={soc2type2Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type2Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('SOC 2 Type 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 2 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type2: checked,
                          });
                          toast.success('SOC 2 Type 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 2 status');
                        }
                      }}
                    />
                    {/* PCI DSS */}
                    <ComplianceFramework
                      title="PCI DSS"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={pcidss}
                      status={pcidssStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            pcidssStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('PCI DSS status updated');
                        } catch (error) {
                          toast.error('Failed to update PCI DSS status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            pcidss: checked,
                          });
                          toast.success('PCI DSS status updated');
                        } catch (error) {
                          toast.error('Failed to update PCI DSS status');
                        }
                      }}
                    />
                    {/* NEN 7510 */}
                    <ComplianceFramework
                      title="NEN 7510"
                      description="A Dutch standard for managing information security systems."
                      isEnabled={nen7510}
                      status={nen7510Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            nen7510Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('NEN 7510 status updated');
                        } catch (error) {
                          toast.error('Failed to update NEN 7510 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            nen7510: checked,
                          });
                          toast.success('NEN 7510 status updated');
                        } catch (error) {
                          toast.error('Failed to update NEN 7510 status');
                        }
                      }}
                    />
                    {/* ISO 9001 */}
                    <ComplianceFramework
                      title="ISO 9001"
                      description="An international standard for quality management systems."
                      isEnabled={iso9001}
                      status={iso9001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso9001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 9001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 9001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso9001: checked,
                          });
                          toast.success('ISO 9001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 9001 status');
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
    title === 'ISO 27001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO27001 className="max-h-full max-w-full" />
      </div>
    ) : title === 'ISO 42001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO42001 className="max-h-full max-w-full" />
      </div>
    ) : title === 'GDPR' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <GDPR className="max-h-full max-w-full" />
      </div>
    ) : title === 'HIPAA' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <HIPAA className="max-h-full max-w-full" />
      </div>
    ) : title === 'SOC 2 Type 1' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <SOC2Type1 className="max-h-full max-w-full" />
      </div>
    ) : title === 'SOC 2 Type 2' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <SOC2Type2 className="max-h-full max-w-full" />
      </div>
    ) : title === 'PCI DSS' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <PCIDSS className="max-h-full max-w-full" />
      </div>
    ) : title === 'NEN 7510' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <NEN7510 className="max-h-full max-w-full" />
      </div>
    ) : title === 'ISO 9001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO9001 className="max-h-full max-w-full" />
      </div>
    ) : null;

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
                        <span className="inline-block h-4 w-4 rounded-sm bg-primary" />
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

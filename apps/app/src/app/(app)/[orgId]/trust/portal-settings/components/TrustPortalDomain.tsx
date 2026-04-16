'use client';

import { useDnsStatus } from '@/hooks/use-dns-status';
import { useDomain } from '@/hooks/use-domain';
import { Button } from '@trycompai/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@trycompai/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@trycompai/ui/form';
import { Input } from '@trycompai/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import { Alert, AlertDescription } from '@trycompai/design-system';
import { CheckmarkFilled, Copy, Launch, Renew, WarningFilled } from '@trycompai/design-system/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermissions } from '@/hooks/use-permissions';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const trustPortalDomainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain cannot be empty.')
    .max(63, 'Domain too long. Max 63 chars.')
    .regex(
      /^(?!-)[A-Za-z0-9-]+([-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,63}$/,
      'Invalid domain format. Use format like sub.example.com',
    )
    .trim(),
});

export function TrustPortalDomain({
  domain: initialDomain,
  domainVerified,
  isVercelDomain,
  vercelVerification,
  orgId,
}: {
  domain: string;
  domainVerified: boolean;
  isVercelDomain: boolean;
  vercelVerification: string | null;
  orgId: string;
}) {
  const { data: domainStatus } = useDomain(initialDomain);

  const verificationInfo = useMemo(() => {
    const data = domainStatus?.data;
    if (data && !data.verified && data.verification && data.verification.length > 0) {
      return data.verification[0];
    }

    return null;
  }, [domainStatus]);

  // Domain is truly verified only when both our DB and Vercel agree.
  // While Vercel data is loading, fall back to DB value to avoid flicker.
  const isVercelVerified = domainStatus?.data?.verified;
  const isEffectivelyVerified =
    domainVerified && (isVercelVerified === undefined || isVercelVerified);

  // Show _vercel TXT row if DB says so OR live Vercel data has verification requirements
  const needsVercelTxt = isVercelDomain || verificationInfo !== null;

  // Prefer live Vercel verification value over stale DB value
  const effectiveVercelTxtValue = verificationInfo?.value ?? vercelVerification;

  const {
    isCnameVerified,
    isTxtVerified,
    isVercelTxtVerified,
    vercelMisconfigured,
    recommendedCNAME: checkRecommendedCNAME,
    mutate: recheckDns,
  } = useDnsStatus({
    domain: initialDomain,
    enabled: !!initialDomain && !isEffectivelyVerified,
  });

  // CNAME target must come from Vercel — never guess a default. The status
  // endpoint's `cnameTarget` is the primary source; the check-dns response can
  // refresh it after the user clicks "Check DNS record".
  // Normalize to include trailing dot for DNS record display.
  const cnameTarget = useMemo<string | null>(() => {
    const target = checkRecommendedCNAME ?? domainStatus?.data?.cnameTarget;
    if (!target) return null;
    return target.endsWith('.') ? target : `${target}.`;
  }, [checkRecommendedCNAME, domainStatus?.data?.cnameTarget]);

  const domainStatusLoading = !!initialDomain && !domainStatus;
  const vercelReportsMisconfigured =
    vercelMisconfigured === true ||
    (domainStatus?.data?.misconfigured === true &&
      vercelMisconfigured !== false);

  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('trust', 'update');
  const { submitCustomDomain, checkDns } = useTrustPortalSettings();
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false);
  const [isCheckingDns, setIsCheckingDns] = useState(false);

  const form = useForm<z.infer<typeof trustPortalDomainSchema>>({
    resolver: zodResolver(trustPortalDomainSchema),
    defaultValues: {
      domain: initialDomain || '',
    },
  });

  const onSubmit = async (data: z.infer<typeof trustPortalDomainSchema>) => {
    setIsUpdatingDomain(true);
    try {
      const result = await submitCustomDomain(data.domain);
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        const errorMsg = 'error' in result ? (result.error as string) : 'Failed to update custom domain.';
        toast.error(errorMsg);
        return;
      }
      toast.success('Custom domain update submitted, please verify your DNS records.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update custom domain.');
    } finally {
      setIsUpdatingDomain(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };

  const handleCheckDnsRecord = async () => {
    setIsCheckingDns(true);
    try {
      const data = await checkDns(form.watch('domain'));
      // Update SWR cache with the result directly — no duplicate request
      recheckDns(data, { revalidate: false });
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        toast.error(data.error as string);
      }
    } catch {
      toast.error(
        'DNS record verification failed, check the records are valid or try again later.',
      );
    } finally {
      setIsCheckingDns(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Configure Custom Domain</CardTitle>
            <CardDescription>
              You can use a custom domain (like trust.example.com) to brand your trust portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Custom Domain
                      {initialDomain !== '' &&
                        (isEffectivelyVerified ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <CheckmarkFilled size={16} className="text-success" />
                              </TooltipTrigger>
                              <TooltipContent>Domain is verified</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <WarningFilled size={16} className="text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>Domain is not verified yet</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                    </FormLabel>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="trust.example.com"
                          className="md:max-w-[300px]"
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck="false"
                          disabled={!canUpdate}
                        />
                      </FormControl>
                      {field.value === initialDomain && initialDomain !== '' && !isEffectivelyVerified && (
                        <Button
                          type="button"
                          className="md:max-w-[300px]"
                          onClick={handleCheckDnsRecord}
                          disabled={isCheckingDns}
                        >
                          {isCheckingDns ? (
                            <Renew size={16} className="mr-1 animate-spin" />
                          ) : null}
                          Check DNS record
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('domain') === initialDomain &&
                initialDomain !== '' &&
                !isEffectivelyVerified && (
                  <div className="space-y-2 pt-2">
                    {verificationInfo && (
                      <Alert variant="warning">
                        <AlertDescription>
                          This domain is linked to another Vercel account. To use it with this
                          project, add a {verificationInfo.type} record at{' '}
                          {verificationInfo.domain} to verify ownership. You can remove the record
                          after verification is complete.{' '}
                          <a
                            href="https://vercel.com/docs/domains/troubleshooting#misconfigured-domain-issues"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Learn more <Launch size={14} className="mb-0.5 inline-block" />
                          </a>
                        </AlertDescription>
                      </Alert>
                    )}
                    {vercelReportsMisconfigured && (
                      <Alert variant="warning">
                        <AlertDescription>
                          Vercel reports this domain is still misconfigured. The CNAME value must
                          match exactly: <code className="font-mono">{cnameTarget ?? 'unknown'}</code>. Update it at
                          your DNS provider and try again.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!cnameTarget && !domainStatusLoading && (
                      <Alert variant="warning">
                        <AlertDescription>
                          Could not fetch the recommended CNAME target from Vercel. Please refresh
                          in a moment — do not guess the value.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="rounded-md border">
                      <div className="text-sm">
                        <table className="hidden w-full table-fixed lg:table">
                          <thead>
                            <tr className="[&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
                              <th className="w-20">Verified</th>
                              <th className="w-16">Type</th>
                              <th className="w-1/4">Name</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                              <td>
                                {isCnameVerified ? (
                                  <CheckmarkFilled size={16} className="text-success" />
                                ) : (
                                  <WarningFilled size={16} className="text-destructive" />
                                )}
                              </td>
                              <td>CNAME</td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">{initialDomain}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(initialDomain, 'Name')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">
                                    {cnameTarget ?? (
                                      <span className="text-muted-foreground italic">
                                        {domainStatusLoading
                                          ? 'Loading from Vercel…'
                                          : 'Unavailable — refresh to retry'}
                                      </span>
                                    )}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() =>
                                      cnameTarget && handleCopy(cnameTarget, 'Value')
                                    }
                                    disabled={!cnameTarget}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                              <td>
                                {isTxtVerified ? (
                                  <CheckmarkFilled size={16} className="text-success" />
                                ) : (
                                  <WarningFilled size={16} className="text-destructive" />
                                )}
                              </td>
                              <td>TXT</td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">@</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() =>
                                      handleCopy(`compai-domain-verification=${orgId}`, 'Name')
                                    }
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">
                                    compai-domain-verification={orgId}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() =>
                                      handleCopy(`compai-domain-verification=${orgId}`, 'Value')
                                    }
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {needsVercelTxt && (
                              <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                                <td>
                                  {isVercelTxtVerified ? (
                                    <CheckmarkFilled size={16} className="text-success" />
                                  ) : (
                                    <WarningFilled size={16} className="text-destructive" />
                                  )}
                                </td>
                                <td>TXT</td>
                                <td>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 break-all">_vercel</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleCopy('_vercel', 'Name')}
                                      className="h-6 w-6 shrink-0"
                                    >
                                      <Copy size={16} />
                                    </Button>
                                  </div>
                                </td>
                                <td>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 break-all">
                                      {effectiveVercelTxtValue}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleCopy(effectiveVercelTxtValue || '', 'Value')}
                                      className="h-6 w-6 shrink-0"
                                    >
                                      <Copy size={16} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        <div className="space-y-4 p-4 lg:hidden">
                          <div className="flex items-center gap-2">
                            {isCnameVerified ? (
                              <CheckmarkFilled size={16} className="shrink-0 text-success" />
                            ) : (
                              <WarningFilled size={16} className="shrink-0 text-destructive" />
                            )}
                            <span className="font-medium">CNAME</span>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Name:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-all">{form.watch('domain')}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => handleCopy(form.watch('domain'), 'Name')}
                                className="h-6 w-6 shrink-0"
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Value:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-all">
                                {cnameTarget ?? (
                                  <span className="text-muted-foreground italic">
                                    {domainStatusLoading
                                      ? 'Loading from Vercel…'
                                      : 'Unavailable — refresh to retry'}
                                  </span>
                                )}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => cnameTarget && handleCopy(cnameTarget, 'Value')}
                                disabled={!cnameTarget}
                                className="h-6 w-6 shrink-0"
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                          <div className="border-b" />
                          <div className="flex items-center gap-2">
                            {isTxtVerified ? (
                              <CheckmarkFilled size={16} className="shrink-0 text-success" />
                            ) : (
                              <WarningFilled size={16} className="shrink-0 text-destructive" />
                            )}
                            <span className="font-medium">TXT</span>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Name:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-all">@</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() =>
                                  handleCopy(`compai-domain-verification=${orgId}`, 'Name')
                                }
                                className="h-6 w-6 shrink-0"
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Value:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-all">
                                compai-domain-verification={orgId}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() =>
                                  handleCopy(`compai-domain-verification=${orgId}`, 'Value')
                                }
                                className="h-6 w-6 shrink-0"
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                          {needsVercelTxt && (
                            <>
                              <div className="border-b" />
                              <div className="flex items-center gap-2">
                                {isVercelTxtVerified ? (
                                  <CheckmarkFilled size={16} className="shrink-0 text-success" />
                                ) : (
                                  <WarningFilled size={16} className="shrink-0 text-destructive" />
                                )}
                                <span className="font-medium">TXT (_vercel)</span>
                              </div>
                              <div>
                                <div className="mb-1 font-medium">Name:</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">_vercel</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy('_vercel', 'Name')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 font-medium">Value:</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-all">{effectiveVercelTxtValue}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(effectiveVercelTxtValue || '', 'Value')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <Copy size={16} />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-muted-foreground text-xs">
              Configure a custom domain for your trust portal.
            </div>
            <Button
              type="submit"
              disabled={
                !canUpdate || isUpdatingDomain || isCheckingDns
              }
            >
              {isUpdatingDomain ? (
                <Renew size={16} className="mr-1 animate-spin" />
              ) : null}
              Save
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

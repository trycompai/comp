'use client';

import { DEFAULT_CNAME_TARGET, useDomain } from '@/hooks/use-domain';
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle, ClipboardCopy, ExternalLink, Loader2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useEffect, useMemo, useState } from 'react';
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
  const [isCnameVerified, setIsCnameVerified] = useState(false);
  const [isTxtVerified, setIsTxtVerified] = useState(false);
  const [isVercelTxtVerified, setIsVercelTxtVerified] = useState(false);

  const { data: domainStatus } = useDomain(initialDomain);

  const verificationInfo = useMemo(() => {
    const data = domainStatus?.data;
    if (data && !data.verified && data.verification && data.verification.length > 0) {
      return data.verification[0];
    }

    return null;
  }, [domainStatus]);

  // Get the actual CNAME target from Vercel, with fallback
  // Normalize to include trailing dot for DNS record display
  const cnameTarget = useMemo(() => {
    const target = domainStatus?.data?.cnameTarget || DEFAULT_CNAME_TARGET;
    return target.endsWith('.') ? target : `${target}.`;
  }, [domainStatus?.data?.cnameTarget]);

  useEffect(() => {
    const isCnameVerified = localStorage.getItem(`${initialDomain}-isCnameVerified`);
    const isTxtVerified = localStorage.getItem(`${initialDomain}-isTxtVerified`);
    const isVercelTxtVerified = localStorage.getItem(`${initialDomain}-isVercelTxtVerified`);
    setIsCnameVerified(isCnameVerified === 'true');
    setIsTxtVerified(isTxtVerified === 'true');
    setIsVercelTxtVerified(isVercelTxtVerified === 'true');
  }, [initialDomain]);

  const api = useApi();
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false);
  const [isCheckingDns, setIsCheckingDns] = useState(false);

  const form = useForm<z.infer<typeof trustPortalDomainSchema>>({
    resolver: zodResolver(trustPortalDomainSchema),
    defaultValues: {
      domain: initialDomain || '',
    },
  });

  const onSubmit = async (data: z.infer<typeof trustPortalDomainSchema>) => {
    setIsCnameVerified(false);
    setIsTxtVerified(false);
    setIsVercelTxtVerified(false);

    localStorage.removeItem(`${initialDomain}-isCnameVerified`);
    localStorage.removeItem(`${initialDomain}-isTxtVerified`);
    localStorage.removeItem(`${initialDomain}-isVercelTxtVerified`);

    setIsUpdatingDomain(true);
    try {
      const response = await api.post<{ success: boolean; needsVerification?: boolean; error?: string }>(
        '/v1/trust-portal/settings/custom-domain',
        { domain: data.domain },
      );
      if (response.error) throw new Error(response.error);
      if (response.data?.success === false) {
        toast.error(response.data.error || 'Failed to update custom domain.');
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
      const response = await api.post<{
        success: boolean;
        isCnameVerified?: boolean;
        isTxtVerified?: boolean;
        isVercelTxtVerified?: boolean;
        error?: string;
      }>('/v1/trust-portal/settings/check-dns', {
        domain: form.watch('domain'),
      });
      if (response.error) throw new Error(response.error);

      const data = response.data;
      if (data?.error) {
        toast.error(data.error);
        if (data.isCnameVerified) {
          setIsCnameVerified(true);
          localStorage.setItem(`${initialDomain}-isCnameVerified`, 'true');
        }
        if (data.isTxtVerified) {
          setIsTxtVerified(true);
          localStorage.setItem(`${initialDomain}-isTxtVerified`, 'true');
        }
        if (data.isVercelTxtVerified) {
          setIsVercelTxtVerified(true);
          localStorage.setItem(`${initialDomain}-isVercelTxtVerified`, 'true');
        }
      } else {
        if (data?.isCnameVerified) {
          setIsCnameVerified(true);
          localStorage.removeItem(`${initialDomain}-isCnameVerified`);
        }
        if (data?.isTxtVerified) {
          setIsTxtVerified(true);
          localStorage.removeItem(`${initialDomain}-isTxtVerified`);
        }
        if (data?.isVercelTxtVerified) {
          setIsVercelTxtVerified(true);
          localStorage.removeItem(`${initialDomain}-isVercelTxtVerified`);
        }
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
                        (domainVerified ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </TooltipTrigger>
                              <TooltipContent>Domain is verified</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <AlertCircle className="h-4 w-4 text-red-500" />
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
                        />
                      </FormControl>
                      {field.value === initialDomain && initialDomain !== '' && !domainVerified && (
                        <Button
                          type="button"
                          className="md:max-w-[300px]"
                          onClick={handleCheckDnsRecord}
                          disabled={isCheckingDns}
                        >
                          {isCheckingDns ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
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
                !domainVerified && (
                  <div className="space-y-2 pt-2">
                    {verificationInfo && (
                      <div className="rounded-md border border-amber-200 bg-amber-100 p-4 dark:border-amber-900 dark:bg-amber-950">
                        <div className="flex gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <p className="text-amber-800 text-sm dark:text-amber-200">
                            This domain is linked to another Vercel account. To use it with this
                            project, add a {verificationInfo.type} record at{' '}
                            {verificationInfo.domain} to verify ownership. You can remove the record
                            after verification is complete.
                            <a
                              href="https://vercel.com/docs/domains/troubleshooting#misconfigured-domain-issues"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-white underline dark:text-white ml-2"
                            >
                              Learn more
                              <ExternalLink className="ml-1 mb-0.5 inline-block h-4 w-4 font-bold text-white dark:text-white stroke-2" />
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="rounded-md border">
                      <div className="text-sm">
                        <table className="hidden w-full lg:table">
                          <thead>
                            <tr className="[&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
                              <th>Verified</th>
                              <th>Type</th>
                              <th>Name</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                              <td>
                                {isCnameVerified ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                              </td>
                              <td>CNAME</td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">{initialDomain}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(initialDomain, 'Name')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">{cnameTarget}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(cnameTarget, 'Value')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                              <td>
                                {isTxtVerified ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                              </td>
                              <td>TXT</td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">@</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() =>
                                      handleCopy(`compai-domain-verification=${orgId}`, 'Name')
                                    }
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">
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
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {isVercelDomain && (
                              <tr className="border-t [&_td]:px-3 [&_td]:py-2">
                                <td>
                                  {isVercelTxtVerified ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </td>
                                <td>TXT</td>
                                <td>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 break-words">_vercel</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleCopy(vercelVerification || '', 'Name')}
                                      className="h-6 w-6 shrink-0"
                                    >
                                      <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                                <td>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 break-words">
                                      {vercelVerification}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleCopy(vercelVerification || '', 'Value')}
                                      className="h-6 w-6 shrink-0"
                                    >
                                      <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        <div className="space-y-4 p-4 lg:hidden">
                          <div>
                            <div className="mb-1 font-medium">Type:</div>
                            <div>CNAME</div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Name:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-words">{form.watch('domain')}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => handleCopy(form.watch('domain'), 'Name')}
                                className="h-6 w-6 shrink-0"
                              >
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Value:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-words">{cnameTarget}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => handleCopy(cnameTarget, 'Value')}
                                className="h-6 w-6 shrink-0"
                              >
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="border-b" />
                          <div>
                            <div className="mb-1 font-medium">Type:</div>
                            <div>TXT</div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Name:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-words">@</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() =>
                                  handleCopy(`compai-domain-verification=${orgId}`, 'Name')
                                }
                                className="h-6 w-6 shrink-0"
                              >
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Value:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 break-words">
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
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {isVercelDomain && (
                            <>
                              <div className="border-b" />
                              <div>
                                <div className="mb-1 font-medium">Type:</div>
                                <div>TXT</div>
                              </div>
                              <div>
                                <div className="mb-1 font-medium">Name:</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">_vercel</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(vercelVerification || '', 'Name')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 font-medium">Value:</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 break-words">{vercelVerification}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleCopy(vercelVerification || '', 'Value')}
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
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
                isUpdatingDomain || isCheckingDns
              }
            >
              {isUpdatingDomain ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              {'Save'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

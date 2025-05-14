"use client";

import { useI18n } from "@/locales/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@comp/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@comp/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@comp/ui/input";
import { Button } from "@comp/ui/button";
import { customDomainAction } from "../actions/custom-domain";
import { checkDnsRecordAction } from "../actions/check-dns-record";
import {
    Loader2,
    ClipboardCopy,
    AlertCircle,
    CheckCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@comp/ui/tooltip";

const trustPortalDomainSchema = z.object({
    domain: z
        .string()
        .min(1, "Domain cannot be empty.")
        .max(63, "Domain too long. Max 63 chars.")
        .regex(
            /^(?!-)[A-Za-z0-9-]+([-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/,
            "Invalid domain format. Use format like sub.example.com",
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
    const t = useI18n();
    const [isCnameVerified, setIsCnameVerified] = useState(false);
    const [isTxtVerified, setIsTxtVerified] = useState(false);
    const [isVercelTxtVerified, setIsVercelTxtVerified] = useState(false);

    useEffect(() => {
        const isCnameVerified = localStorage.getItem(`${initialDomain}-isCnameVerified`);
        const isTxtVerified = localStorage.getItem(`${initialDomain}-isTxtVerified`);
        const isVercelTxtVerified = localStorage.getItem(`${initialDomain}-isVercelTxtVerified`);
        setIsCnameVerified(isCnameVerified === "true");
        setIsTxtVerified(isTxtVerified === "true");
        setIsVercelTxtVerified(isVercelTxtVerified === "true");
    }, []);

    const updateCustomDomain = useAction(customDomainAction, {
        onSuccess: (data) => {
            toast.success("Custom domain update submitted, please verify your DNS records.");
        },
        onError: (error) => {
            toast.error(error.error.serverError || error.error.validationErrors?._errors?.[0] || "Failed to update custom domain.");
        },
    });

    const checkDnsRecord = useAction(checkDnsRecordAction, {
        onSuccess: (data) => {
            if (data?.data?.error) {
                toast.error(data.data.error);

                if (data.data?.isCnameVerified) {
                    setIsCnameVerified(true);
                    localStorage.setItem(`${initialDomain}-isCnameVerified`, "true");
                }
                if (data.data?.isTxtVerified) {
                    setIsTxtVerified(true);
                    localStorage.setItem(`${initialDomain}-isTxtVerified`, "true");
                }
                if (data.data?.isVercelTxtVerified) {
                    setIsVercelTxtVerified(true);
                    localStorage.setItem(`${initialDomain}-isVercelTxtVerified`, "true");
                }
            } else {
                if (data.data?.isCnameVerified) {
                    setIsCnameVerified(true);
                    localStorage.removeItem(`${initialDomain}-isCnameVerified`);
                }
                if (data.data?.isTxtVerified) {
                    setIsTxtVerified(true);
                    localStorage.removeItem(`${initialDomain}-isTxtVerified`);
                }
                if (data.data?.isVercelTxtVerified) {
                    setIsVercelTxtVerified(true);
                    localStorage.removeItem(`${initialDomain}-isVercelTxtVerified`);
                }
            }
        },
        onError: () => {
            toast.error("DNS record verification failed, check the records are valid or try again later.");
        },
    });

    const form = useForm<z.infer<typeof trustPortalDomainSchema>>({
        resolver: zodResolver(trustPortalDomainSchema),
        defaultValues: {
            domain: initialDomain || "",
        },
    });

    const onSubmit = async (data: z.infer<typeof trustPortalDomainSchema>) => {
        setIsCnameVerified(false);
        setIsTxtVerified(false);
        setIsVercelTxtVerified(false);

        localStorage.removeItem(`${initialDomain}-isCnameVerified`);
        localStorage.removeItem(`${initialDomain}-isTxtVerified`);
        localStorage.removeItem(`${initialDomain}-isVercelTxtVerified`);

        updateCustomDomain.execute({ domain: data.domain });
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
    };

    const handleCheckDnsRecord = () => {
        checkDnsRecord.execute({ domain: form.watch("domain") });
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
                                            {initialDomain !== "" && (
                                                domainVerified ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger type="button">
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Domain is verified
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger type="button">
                                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Domain is not verified yet
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )
                                            )}
                                        </FormLabel>
                                        <div className="flex flex-col md:flex-row gap-2">
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
                                            {field.value === initialDomain && initialDomain !== "" && !domainVerified && (
                                                <Button
                                                    type="button"
                                                    className="md:max-w-[300px]"
                                                    onClick={handleCheckDnsRecord}
                                                    disabled={checkDnsRecord.status === "executing"}
                                                >
                                                    {checkDnsRecord.status === "executing" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                    ) : null}
                                                    Check DNS record
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.watch("domain") === initialDomain && initialDomain !== "" && !domainVerified && (
                                <div className="space-y-2 pt-2">
                                    <div className="rounded-md border">
                                        <div className="text-sm">
                                            <table className="hidden lg:table w-full">
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
                                                                    onClick={() => handleCopy(initialDomain, "Name")}
                                                                    className="h-6 w-6 flex-shrink-0"
                                                                >
                                                                    <ClipboardCopy className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="min-w-0 break-words">
                                                                    cname.vercel-dns.com.
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopy(
                                                                            "cname.vercel-dns.com.",
                                                                            "Value",
                                                                        )
                                                                    }
                                                                    className="h-6 w-6 flex-shrink-0"
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
                                                                <span className="min-w-0 break-words">
                                                                    @
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    type="button"
                                                                    onClick={() => handleCopy(`compai-domain-verification=${orgId}`, "Name")}
                                                                    className="h-6 w-6 flex-shrink-0"
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
                                                                        handleCopy(
                                                                            `compai-domain-verification=${orgId}`,
                                                                            "Value",
                                                                        )
                                                                    }
                                                                    className="h-6 w-6 flex-shrink-0"
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
                                                                    <span className="min-w-0 break-words">
                                                                        _vercel
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        type="button"
                                                                        onClick={() => handleCopy(vercelVerification || "", "Name")}
                                                                        className="h-6 w-6 flex-shrink-0"
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
                                                                        onClick={() =>
                                                                            handleCopy(
                                                                                vercelVerification || "",
                                                                                "Value",
                                                                            )
                                                                        }
                                                                        className="h-6 w-6 flex-shrink-0"
                                                                    >
                                                                        <ClipboardCopy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>

                                            <div className="lg:hidden space-y-4 p-4">
                                                <div>
                                                    <div className="font-medium mb-1">Type:</div>
                                                    <div>CNAME</div>
                                                </div>
                                                <div>
                                                    <div className="font-medium mb-1">Name:</div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 break-words">{form.watch("domain")}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => handleCopy(form.watch("domain"), "Name")}
                                                            className="h-6 w-6 flex-shrink-0"
                                                        >
                                                            <ClipboardCopy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-medium mb-1">Value:</div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 break-words">
                                                            cname.vercel-dns.com.
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() =>
                                                                handleCopy(
                                                                    "cname.vercel-dns.com.",
                                                                    "Value",
                                                                )
                                                            }
                                                            className="h-6 w-6 flex-shrink-0"
                                                        >
                                                            <ClipboardCopy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="border-b" />
                                                <div>
                                                    <div className="font-medium mb-1">Type:</div>
                                                    <div>TXT</div>
                                                </div>
                                                <div>
                                                    <div className="font-medium mb-1">Name:</div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 break-words">
                                                            @
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => handleCopy(`compai-domain-verification=${orgId}`, "Name")}
                                                            className="h-6 w-6 flex-shrink-0"
                                                        >
                                                            <ClipboardCopy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-medium mb-1">Value:</div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 break-words">
                                                            compai-domain-verification={orgId}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() =>
                                                                handleCopy(
                                                                    `compai-domain-verification=${orgId}`,
                                                                    "Value",
                                                                )
                                                            }
                                                            className="h-6 w-6 flex-shrink-0"
                                                        >
                                                            <ClipboardCopy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {isVercelDomain && (
                                                    <>
                                                        <div className="border-b" />
                                                        <div>
                                                            <div className="font-medium mb-1">Type:</div>
                                                            <div>TXT</div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium mb-1">Name:</div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="min-w-0 break-words">
                                                                    _vercel
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    type="button"
                                                                    onClick={() => handleCopy(vercelVerification || "", "Name")}
                                                                    className="h-6 w-6 flex-shrink-0"
                                                                >
                                                                    <ClipboardCopy className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium mb-1">Value:</div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="min-w-0 break-words">
                                                                    {vercelVerification}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopy(
                                                                            vercelVerification || "",
                                                                            "Value",
                                                                        )
                                                                    }
                                                                    className="h-6 w-6 flex-shrink-0"
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
                        <div className="text-xs text-muted-foreground">
                            Configure a custom domain for your trust portal.
                        </div>
                        <Button
                            type="submit"
                            disabled={
                                updateCustomDomain.status === "executing" ||
                                checkDnsRecord.status === "executing"
                            }
                        >
                            {updateCustomDomain.status === "executing" ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            {t("common.actions.save")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}

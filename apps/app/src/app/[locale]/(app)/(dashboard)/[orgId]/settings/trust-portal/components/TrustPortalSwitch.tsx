"use client"

import { useI18n } from "@/locales/client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@comp/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@comp/ui/form"
import { Switch } from "@comp/ui/switch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { trustPortalSwitchAction } from "../actions/trust-portal-switch"
import Link from "next/link"
import { ExternalLink, Loader2 } from "lucide-react"
import { Input } from "@comp/ui/input"
import { Button } from "@comp/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@comp/ui/select"
import { updateTrustPortalFrameworks } from "../actions/update-trust-portal-frameworks"
import { SOC2, ISO27001, GDPR } from "./logos"

const trustPortalSwitchSchema = z.object({
    enabled: z.boolean(),
    contactEmail: z.string().email().or(z.literal("")).optional(),
    soc2: z.boolean(),
    iso27001: z.boolean(),
    gdpr: z.boolean(),
    soc2Status: z.enum(["started", "in_progress", "compliant"]),
    iso27001Status: z.enum(["started", "in_progress", "compliant"]),
    gdprStatus: z.enum(["started", "in_progress", "compliant"]),
})

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
}: {
    enabled: boolean
    slug: string
    domainVerified: boolean
    domain: string
    contactEmail: string | null
    orgId: string
    soc2: boolean
    iso27001: boolean
    gdpr: boolean
    soc2Status: "started" | "in_progress" | "compliant"
    iso27001Status: "started" | "in_progress" | "compliant"
    gdprStatus: "started" | "in_progress" | "compliant"
}) {
    const t = useI18n()

    const trustPortalSwitch = useAction(trustPortalSwitchAction, {
        onSuccess: () => {
            toast.success("Trust portal status updated")
        },
        onError: () => {
            toast.error("Failed to update trust portal status")
        },
    })

    const form = useForm<z.infer<typeof trustPortalSwitchSchema>>({
        resolver: zodResolver(trustPortalSwitchSchema),
        defaultValues: {
            enabled: enabled,
            contactEmail: contactEmail ?? undefined,
            soc2: soc2 ?? false,
            iso27001: iso27001 ?? false,
            gdpr: gdpr ?? false,
            soc2Status: soc2Status ?? "started",
            iso27001Status: iso27001Status ?? "started",
            gdprStatus: gdprStatus ?? "started",
        },
    })

    const onSubmit = async (data: z.infer<typeof trustPortalSwitchSchema>) => {
        await trustPortalSwitch.execute(data)
    }

    const portalUrl = domainVerified ? `https://${domain}` : `https://trust.trycomp.ai/${slug}`

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Card className="overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    Trust Portal
                                    <Link
                                        href={portalUrl}
                                        target="_blank"
                                        className="text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Create a public trust portal for your organization.</p>
                            </div>
                            <FormField
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={trustPortalSwitch.status === "executing"}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                        {form.watch("enabled") && (
                            <div className="pt-2">
                                <h3 className="text-sm font-medium mb-4">Information Requests</h3>
                                <div className="rounded-md border p-4">
                                    <FormField
                                        control={form.control}
                                        name="contactEmail"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between">
                                                <FormLabel>
                                                    Contact Email
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
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
                        {form.watch("enabled") && (
                            <div className="">
                                {/* Compliance Frameworks Section */}
                                <div>
                                    <h3 className="text-sm font-medium mb-4">Compliance Frameworks</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* SOC 2 */}
                                        <ComplianceFramework
                                            title="SOC 2"
                                            description="Show your SOC 2 compliance status"
                                            isEnabled={soc2}
                                            status={soc2Status}
                                            onStatusChange={async (value) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        soc2Status: value as "started" | "in_progress" | "compliant",
                                                    })
                                                    toast.success("SOC 2 status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update SOC 2 status")
                                                }
                                            }}
                                            onToggle={async (checked) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        soc2: checked,
                                                    })
                                                    toast.success("SOC 2 status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update SOC 2 status")
                                                }
                                            }}
                                        />
                                        {/* ISO 27001 */}
                                        <ComplianceFramework
                                            title="ISO 27001"
                                            description="Show your ISO 27001 compliance status"
                                            isEnabled={iso27001}
                                            status={iso27001Status}
                                            onStatusChange={async (value) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        iso27001Status: value as "started" | "in_progress" | "compliant",
                                                    })
                                                    toast.success("ISO 27001 status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update ISO 27001 status")
                                                }
                                            }}
                                            onToggle={async (checked) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        iso27001: checked,
                                                    })
                                                    toast.success("ISO 27001 status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update ISO 27001 status")
                                                }
                                            }}
                                        />
                                        {/* GDPR */}
                                        <ComplianceFramework
                                            title="GDPR"
                                            description="Show your GDPR compliance status"
                                            isEnabled={gdpr}
                                            status={gdprStatus}
                                            onStatusChange={async (value) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        gdprStatus: value as "started" | "in_progress" | "compliant",
                                                    })
                                                    toast.success("GDPR status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update GDPR status")
                                                }
                                            }}
                                            onToggle={async (checked) => {
                                                try {
                                                    await updateTrustPortalFrameworks({
                                                        orgId,
                                                        gdpr: checked,
                                                    })
                                                    toast.success("GDPR status updated")
                                                } catch (error) {
                                                    toast.error("Failed to update GDPR status")
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between px-6 py-4">
                        {enabled ? (
                            <Link href={portalUrl} target="_blank" className="text-xs text-muted-foreground hover:text-foreground">
                                Click here to visit your trust portal.
                            </Link>
                        ) : (
                            <p className="text-xs text-muted-foreground">Trust portal is currently disabled.</p>
                        )}
                        <Button type="submit" disabled={trustPortalSwitch.status === "executing"}>
                            {trustPortalSwitch.status === "executing" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {t("common.actions.save")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
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
    title: string
    description: string
    isEnabled: boolean
    status: string
    onStatusChange: (value: string) => Promise<void>
    onToggle: (checked: boolean) => Promise<void>
}) {
    const logo = title === "SOC 2" ? <SOC2 className="w-10 h-10" /> : title === "ISO 27001" ? <ISO27001 className="w-10 h-10" /> : <GDPR className="w-10 h-10" />

    return (
        <div className="flex space-y-2 sm:space-y-0 flex-row items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    {logo}
                    <h4 className="text-sm font-medium">{title}</h4>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isEnabled && (
                    <Select defaultValue={status} onValueChange={onStatusChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="started">Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="compliant">Compliant</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                <Switch checked={isEnabled} onCheckedChange={onToggle} />
            </div>
        </div>
    )
}

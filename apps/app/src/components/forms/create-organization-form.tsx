"use client";

import { createOrganizationAction } from "@/actions/organization/create-organization-action";
import { organizationSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@bubba/ui/form";
import { Input } from "@bubba/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { Framework, Organization } from "@bubba/db/types";
import { Icons } from "@bubba/ui/icons";
import Link from "next/link";
import { Checkbox } from "@bubba/ui/checkbox";
import { cn } from "@bubba/ui/cn";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useRouter } from "next/navigation";
import { LogoSpinner } from "../logo-spinner";

function RealtimeStatus({
  runId,
  publicAccessToken,
  newOrganization,
}: {
  runId: string;
  publicAccessToken: string;
  newOrganization: Pick<Organization, "id" | "name"> | null;
}) {
  const t = useI18n();
  const router = useRouter();

  const { run, error } = useRealtimeRun(runId, {
    accessToken: publicAccessToken,
    onComplete: (run, error) => {
      if (error) {
        toast.error(t("common.actions.error"), { duration: 5000 });
        return;
      }
    },
  });

  useEffect(() => {
    if (run?.status === "COMPLETED" && newOrganization) {
      router.push("/");
    }
  }, [run, router, newOrganization]);

  return (
    <div className="flex flex-col justify-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {run?.status !== "FAILED" && (
        <div className="flex flex-col gap-2 justify-center">
          <LogoSpinner />
          <h2 className="text-xl font-semibold text-center tracking-tight">
            {t("onboarding.trigger.title")}
          </h2>
          <p className="text-center text-sm text-muted-foreground">
            {t("onboarding.trigger.creating")}
          </p>
        </div>
      )}
    </div>
  );
}

function OnboardingClient({ frameworks }: { frameworks: Framework[] }) {
  const t = useI18n();
  const { data: session } = useSession();
  const [runId, setRunId] = useState<string | null>(null);
  const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
    null,
  );
  const newOrganizationRef = useRef<Pick<Organization, "id" | "name"> | null>(
    null,
  );

  const createOrganization = useAction(createOrganizationAction, {
    onSuccess: async (data) => {
      setRunId(data.data?.runId ?? null);
      setPublicAccessToken(data.data?.publicAccessToken ?? null);
      newOrganizationRef.current = data.data?.newOrganization ?? null;
    },
    onError: () => {
      toast.error(t("common.actions.error"), { duration: 5000 });
    },
  });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      fullName: session?.user?.name ?? "",
      name: "",
      website: "",
      frameworks: [],
    },
    mode: "onChange",
  });

  const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
    createOrganization.execute(data);
  };

  if (runId && publicAccessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
        <div className="relative w-full max-w-[440px] border bg-card p-8 shadow-lg">
          <RealtimeStatus
            runId={runId}
            publicAccessToken={publicAccessToken}
            newOrganization={newOrganizationRef.current}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
      <div className="relative w-full max-w-[440px] border bg-card p-8 shadow-lg">
        <div className="mb-8 flex justify-between">
          <Link href="/">
            <Icons.Logo />
          </Link>
        </div>

        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("onboarding.setup")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.description")}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            suppressHydrationWarning
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    {t("onboarding.fields.fullName.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoCorrect="off"
                      placeholder={t("onboarding.fields.fullName.placeholder")}
                      suppressHydrationWarning
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    {t("onboarding.fields.name.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoCorrect="off"
                      placeholder={t("onboarding.fields.name.placeholder")}
                      suppressHydrationWarning
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    {t("onboarding.fields.website.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoCorrect="off"
                      placeholder={t("onboarding.fields.website.placeholder")}
                      suppressHydrationWarning
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frameworks"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    {t("frameworks.overview.grid.title")}
                  </FormLabel>
                  <FormControl>
                    <fieldset className="flex flex-col gap-2 select-none">
                      <legend className="sr-only">
                        {t("frameworks.overview.grid.title")}
                      </legend>
                      {frameworks.map((framework) => (
                        <label
                          key={framework.id}
                          htmlFor={`framework-${framework.id}`}
                          className={cn(
                            "relative flex flex-col p-4 border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full text-left",
                            field.value.includes(framework.id) &&
                            "border-primary bg-primary/5",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {framework.name}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {framework.description}
                              </p>
                              <p className="text-xs text-muted-foreground/75 mt-2">
                                {`${t("frameworks.overview.grid.version")}: ${framework.version}`}
                              </p>
                            </div>
                            <div>
                              <Checkbox
                                id={`framework-${framework.id}`}
                                checked={field.value.includes(framework.id)}
                                className="mt-1"
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, framework.id]
                                    : field.value.filter(
                                      (id) => id !== framework.id,
                                    );
                                  field.onChange(newValue);
                                }}
                              />
                            </div>
                          </div>
                        </label>
                      ))}
                    </fieldset>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createOrganization.status === "executing"}
              suppressHydrationWarning
            >
              {createOrganization.status === "executing" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("onboarding.submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export function Onboarding({ frameworks }: { frameworks: Framework[] }) {
  return <OnboardingClient frameworks={frameworks} />;
}

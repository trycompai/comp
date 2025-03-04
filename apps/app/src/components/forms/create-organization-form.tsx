"use client";

import { checkSubdomainAvailability } from "@/actions/organization/check-subdomain-availability";
import { createOrganizationAction } from "@/actions/organization/create-organization-action";
import {
  organizationSchema,
  subdomainAvailabilitySchema,
} from "@/actions/schema";
import { env } from "@/env.mjs";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Checkbox } from "@bubba/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@bubba/ui/form";
import { Input } from "@bubba/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  Loader2,
  XIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import type { z } from "zod";

interface BaseFieldConfig {
  name: string;
  label: string;
  placeholder: string;
}

interface TextFieldConfig extends BaseFieldConfig {
  type?: "text";
}

interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  options?: string[];
}

interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  options: string[];
}

type FieldConfig = TextFieldConfig | CheckboxFieldConfig | SelectFieldConfig;

export function Onboarding() {
  const t = useI18n();

  const { data: session } = useSession();
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isNameAvailable, setIsNameAvailable] = useState<boolean | null>(null);

  const hasVercelConfig = Boolean(env.NEXT_PUBLIC_VERCEL_URL);

  const steps: Array<{
    title: string;
    description: string;
    fields: FieldConfig[];
  }> = [
    {
      title: t("onboarding.title"),
      description: t("onboarding.description"),
      fields: [
        {
          name: "fullName",
          label: t("onboarding.fields.fullName.label"),
          placeholder: t("onboarding.fields.fullName.placeholder"),
        },
        {
          name: "name",
          label: t("onboarding.fields.name.label"),
          placeholder: t("onboarding.fields.name.placeholder"),
        },
        {
          name: "website",
          label: t("onboarding.fields.website.label"),
          placeholder: t("onboarding.fields.website.placeholder"),
        },
        ...(hasVercelConfig
          ? [
              {
                name: "subdomain",
                label: t("onboarding.fields.subdomain.label"),
                placeholder: t("onboarding.fields.subdomain.placeholder"),
              },
            ]
          : []),
      ],
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const checkAvailability = useAction(checkSubdomainAvailability, {
    onSuccess: (result) => {
      if (result.data?.data === false) {
        setIsCheckingName(false);
        setIsNameAvailable(false);
      } else {
        setIsCheckingName(false);
        setIsNameAvailable(true);
      }
    },
    onError: () => {
      setIsCheckingName(false);
      setIsNameAvailable(false);
    },
  });

  const debouncedCheck = useDebouncedCallback(async (subdomain: string) => {
    setIsNameAvailable(null);

    const result = subdomainAvailabilitySchema.safeParse({ subdomain });

    if (!result.success) {
      setIsNameAvailable(false);
      return;
    }

    setIsCheckingName(true);
    checkAvailability.execute({ subdomain });
  }, 500);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const currentFields = steps[currentStep].fields.map(
        (field) => field.name,
      ) as Array<keyof z.infer<typeof organizationSchema>>;

      const result = await form.trigger(currentFields);

      if (result) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createOrganization = useAction(createOrganizationAction, {
    onSuccess: () => {
      toast.success(t("onboarding.success"));
    },
    onError: () => {
      toast.error(t("common.actions.error"));
    },
  });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      fullName: session?.user?.name ?? "",
      name: "",
      website: "",
      ...(hasVercelConfig ? { subdomain: "" } : {}),
    },
    mode: "onChange",
  });

  const onSubmit = (data: z.infer<typeof organizationSchema>) => {
    createOrganization.execute(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
      <div className="relative w-full max-w-[440px] border bg-card p-8 shadow-lg">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("onboarding.setup")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {steps[currentStep].fields.map((fieldConfig) => (
              <FormField
                control={form.control}
                name={
                  fieldConfig.name as keyof z.infer<typeof organizationSchema>
                }
                key={fieldConfig.name}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      {fieldConfig.label}
                    </FormLabel>
                    <FormControl>
                      {fieldConfig.name === "subdomain" ? (
                        <div className="relative flex">
                          <Input
                            autoCorrect="off"
                            placeholder={fieldConfig.placeholder}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e);
                              debouncedCheck(e.target.value);
                            }}
                          />
                          {env.NEXT_PUBLIC_VERCEL_URL && (
                            <div className="inline-flex items-center border border-l border-input bg-muted px-3 text-sm text-muted-foreground">
                              .{env.NEXT_PUBLIC_VERCEL_URL}
                            </div>
                          )}
                        </div>
                      ) : (fieldConfig as CheckboxFieldConfig).type ===
                        "checkbox" ? (
                        <div className="space-y-3 pt-1">
                          {(fieldConfig as CheckboxFieldConfig).options ? (
                            (fieldConfig as CheckboxFieldConfig).options?.map(
                              (option) => (
                                <div
                                  key={option}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    checked={field.value?.includes(option)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = Array.isArray(
                                        field.value,
                                      )
                                        ? field.value
                                        : [];
                                      const newValue = checked
                                        ? [...currentValue, option]
                                        : currentValue.filter(
                                            (v: string) => v !== option,
                                          );
                                      field.onChange(newValue);
                                    }}
                                  />
                                  <span className="text-sm">{option}</span>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={field.onChange}
                              />
                              <span className="text-sm">
                                {fieldConfig.label}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (fieldConfig as SelectFieldConfig).type ===
                        "select" ? (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value as string}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={fieldConfig.placeholder}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(fieldConfig as SelectFieldConfig).options.map(
                              (option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          autoCorrect="off"
                          placeholder={fieldConfig.placeholder}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    </FormControl>
                    <FormMessage className="text-xs" />
                    {fieldConfig.name === "subdomain" &&
                      field.value &&
                      isCheckingName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">
                            {t("onboarding.check_availability")}
                          </span>
                        </div>
                      )}
                    {fieldConfig.name === "subdomain" && isNameAvailable && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckIcon className="h-4 w-4" />
                        <span className="text-xs">
                          {t("onboarding.available")}
                        </span>
                      </div>
                    )}
                    {fieldConfig.name === "subdomain" &&
                      !form.formState.errors.subdomain &&
                      !isNameAvailable &&
                      !isCheckingName &&
                      field.value && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <XIcon className="h-4 w-4" />
                          <span className="text-xs">
                            {t("onboarding.unavailable")}
                          </span>
                        </div>
                      )}
                  </FormItem>
                )}
              />
            ))}

            <div className="flex justify-between gap-4 pt-4">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handlePrevious}
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              <Button
                type={currentStep === steps.length - 1 ? "submit" : "button"}
                className="w-full"
                disabled={
                  !form.formState.isValid ||
                  form.formState.isValidating ||
                  (hasVercelConfig && (isCheckingName || !isNameAvailable)) ||
                  createOrganization.status === "executing"
                }
                onClick={
                  currentStep === steps.length - 1 ? undefined : handleNext
                }
              >
                <div className="flex items-center justify-center">
                  {createOrganization.status === "executing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentStep === steps.length - 1 ? (
                    t("common.actions.complete")
                  ) : (
                    t("common.actions.next")
                  )}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

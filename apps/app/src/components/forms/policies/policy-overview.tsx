"use client";

import { updatePolicyFormAction } from "@/actions/policies/update-policy-form-action";
import { updatePolicyFormSchema } from "@/actions/schema";
import { SelectUser } from "@/components/select-user";
import {
  STATUS_TYPES,
  StatusPolicies,
  type StatusType,
} from "@/components/status-policies";
import { useI18n } from "@/locales/client";
import {
  Departments,
  Frequency,
  type OrganizationPolicy,
  type Policy,
  type PolicyStatus,
  type Risk,
  RiskCategory,
  RiskStatus,
  type User,
} from "@bubba/db";
import { Button } from "@bubba/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@bubba/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@bubba/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { format } from "date-fns";
import { Calendar } from "@bubba/ui/calendar";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { cn } from "@bubba/ui/cn";
import { useSession } from "next-auth/react";

export function UpdatePolicyOverview({
  organizationPolicy,
  users,
}: {
  organizationPolicy: OrganizationPolicy & { policy: Policy };
  users: User[];
}) {
  const t = useI18n();
  const session = useSession();

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success(t("policies.overview.form.update_policy_success"));
    },
    onError: () => {
      toast.error(t("policies.overview.form.update_policy_error"));
    },
  });

  const calculateReviewDate = (): Date => {
    if (!organizationPolicy.reviewDate) {
      return new Date();
    }
    return new Date(organizationPolicy.reviewDate);
  };

  const reviewDate = calculateReviewDate();

  const form = useForm<z.infer<typeof updatePolicyFormSchema>>({
    resolver: zodResolver(updatePolicyFormSchema),
    defaultValues: {
      id: organizationPolicy.id,
      status: organizationPolicy.status,
      ownerId: organizationPolicy.ownerId ?? session.data?.user?.id,
      department: organizationPolicy.department ?? Departments.admin,
      review_frequency: organizationPolicy.frequency ?? Frequency.monthly,
      review_date: reviewDate,
    },
  });

  const onSubmit = (data: z.infer<typeof updatePolicyFormSchema>) => {
    updatePolicyForm.execute({
      id: data.id,
      status: data.status as PolicyStatus,
      ownerId: data.ownerId,
      department: data.department,
      review_frequency: data.review_frequency,
      review_date: data.review_date,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.assignee.label")}</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={() => form.handleSubmit(onSubmit)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("common.assignee.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectUser
                        isLoading={false}
                        onSelect={field.onChange}
                        selectedId={field.value}
                        users={users}
                      />
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("risk.form.risk_status")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("risk.form.risk_status_placeholder")}
                      >
                        {field.value && (
                          <StatusPolicies status={field.value as StatusType} />
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_TYPES.map((status) => (
                        <SelectItem key={status} value={status}>
                          <StatusPolicies status={status} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="review_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("policies.overview.form.review_frequency")}
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "policies.overview.form.review_frequency_placeholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Frequency).map((frequency) => (
                        <SelectItem key={frequency} value={frequency}>
                          {t(`common.frequency.${frequency}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("risk.form.risk_department")}</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("risk.form.risk_department_placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Departments).map((department) => {
                        const formattedDepartment = department.toUpperCase();

                        return (
                          <SelectItem key={department} value={department}>
                            {formattedDepartment}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="review_date"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-4">
                <FormLabel>{t("policies.overview.form.review_date")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl className="my-2">
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>
                            {t(
                              "policies.overview.form.review_date_placeholder",
                            )}
                          </span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date <= new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            variant="action"
            disabled={updatePolicyForm.status === "executing"}
          >
            {updatePolicyForm.status === "executing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("common.actions.save")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

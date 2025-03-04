"use client";

import { updatePolicyOverviewAction } from "@/actions/policies/update-policy-overview-action";
import { updatePolicyOverviewSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import type { OrganizationPolicy, Policy } from "@bubba/db";
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
import { Textarea } from "@bubba/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export function UpdatePolicyForm({
  policy,
}: {
  policy: OrganizationPolicy & { policy: Policy };
}) {
  const t = useI18n();
  const [open, setOpen] = useQueryState("policy-overview-sheet");

  const updatePolicy = useAction(updatePolicyOverviewAction, {
    onSuccess: () => {
      toast.success(t("policies.overview.form.update_policy_success"));
      setOpen(null);
    },
    onError: () => {
      toast.error(t("policies.overview.form.update_policy_error"));
    },
  });

  const form = useForm<z.infer<typeof updatePolicyOverviewSchema>>({
    resolver: zodResolver(updatePolicyOverviewSchema),
    defaultValues: {
      id: policy.id,
      title: policy.policy.name,
      description: policy.policy.description ?? "",
    },
  });

  const onSubmit = (data: z.infer<typeof updatePolicyOverviewSchema>) => {
    updatePolicy.execute({
      id: data.id,
      title: data.title,
      description: data.description,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("policies.overview.form.update_policy_title")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    className="mt-3"
                    placeholder={t(
                      "policies.overview.form.update_policy_title",
                    )}
                    autoCorrect="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="mt-3 min-h-[80px]"
                    placeholder={t("risk.form.risk_description_description")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end mt-8">
          <Button
            type="submit"
            variant="action"
            disabled={updatePolicy.status === "executing"}
          >
            {updatePolicy.status === "executing" ? (
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

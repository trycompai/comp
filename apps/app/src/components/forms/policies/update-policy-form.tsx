"use client";

import { updatePolicyOverviewAction } from "@/actions/policies/update-policy-overview-action";
import { updatePolicyOverviewSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { Policy } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import { Input } from "@comp/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { Textarea } from "@comp/ui/textarea";
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
	policy: Policy;
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
			title: policy.name,
			description: policy.description ?? "",
			isRequiredToSign: policy.isRequiredToSign ? "required" : "not_required",
		},
	});

	const onSubmit = (data: z.infer<typeof updatePolicyOverviewSchema>) => {
		updatePolicy.execute({
			id: data.id,
			title: data.title,
			description: data.description,
			isRequiredToSign: data.isRequiredToSign,
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
										placeholder={t(
											"policies.overview.form.description_placeholder",
										)}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="isRequiredToSign"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("policies.overview.form.signature_requirement")}
								</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder={t(
													"policies.overview.form.signature_requirement_placeholder",
												)}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="required">
												{t("policies.overview.form.signature_required")}
											</SelectItem>
											<SelectItem value="not_required">
												{t("policies.overview.form.signature_not_required")}
											</SelectItem>
										</SelectContent>
									</Select>
								</FormControl>
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

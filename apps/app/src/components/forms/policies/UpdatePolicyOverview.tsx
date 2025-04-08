"use client";

import { updatePolicyFormAction } from "@/actions/policies/update-policy-form-action";
import { updatePolicyFormSchema } from "@/actions/schema";
import { SelectAssignee } from "@/components/SelectAssignee";
import { StatusPolicies, type StatusType } from "@/components/status-policies";
import { useI18n } from "@/locales/client";
import {
	Departments,
	Frequency,
	Member,
	User,
	type Policy,
	type PolicyStatus,
} from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { Calendar } from "@comp/ui/calendar";
import { cn } from "@comp/ui/cn";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@comp/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { Switch } from "@comp/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

const policyStatuses: PolicyStatus[] = [
	"draft",
	"published",
	"needs_review",
] as const;

export function UpdatePolicyOverview({
	policy,
	assignees,
}: {
	policy: Policy;
	assignees: (Member & { user: User })[];
}) {
	const t = useI18n();

	const updatePolicyForm = useAction(updatePolicyFormAction, {
		onSuccess: () => {
			toast.success(t("policies.overview.form.update_policy_success"));
		},
		onError: () => {
			toast.error(t("policies.overview.form.update_policy_error"));
		},
	});

	const calculateReviewDate = (): Date => {
		if (!policy.reviewDate) {
			return new Date();
		}
		return new Date(policy.reviewDate);
	};

	const reviewDate = calculateReviewDate();

	const form = useForm<z.infer<typeof updatePolicyFormSchema>>({
		resolver: zodResolver(updatePolicyFormSchema),
		defaultValues: {
			id: policy.id,
			status: policy.status,
			assigneeId: policy.assigneeId ?? "",
			department: policy.department ?? Departments.admin,
			review_frequency: policy.frequency ?? Frequency.monthly,
			review_date: reviewDate,
			isRequiredToSign: policy.isRequiredToSign ? "required" : "not_required",
		},
	});

	const onSubmit = (data: z.infer<typeof updatePolicyFormSchema>) => {
		updatePolicyForm.execute({
			id: data.id,
			status: data.status as PolicyStatus,
			assigneeId: data.assigneeId,
			department: data.department,
			review_frequency: data.review_frequency,
			review_date: data.review_date,
			isRequiredToSign: data.isRequiredToSign,
		});
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("policies.overview.form.status")}</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder={t(
													"policies.overview.form.status_placeholder",
												)}
											>
												{field.value && (
													<StatusPolicies status={field.value as StatusType} />
												)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{policyStatuses.map((status) => (
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
								<FormLabel>
									{t("policies.overview.form.policy_department")}
								</FormLabel>
								<FormControl>
									<Select
										{...field}
										value={field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={t(
													"policies.overview.form.policy_department_placeholder",
												)}
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
					<FormField
						control={form.control}
						name="assigneeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("policies.overview.form.policy_assignee")}
								</FormLabel>
								<FormControl>
									<SelectAssignee
										assignees={assignees}
										onAssigneeChange={field.onChange}
										assigneeId={field.value ?? null}
										disabled={updatePolicyForm.status === "executing"}
										withTitle={false}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
					<FormField
						control={form.control}
						name="review_date"
						render={({ field }) => (
							<FormItem className="flex flex-col">
								<FormLabel>{t("policies.overview.form.review_date")}</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<div className="pt-1.5">
												<Button
													variant={"outline"}
													className={cn(
														"pl-3 text-left font-normal w-full",
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
											</div>
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
					<FormField
						control={form.control}
						name="isRequiredToSign"
						render={({ field }) => (
							<FormItem className="flex flex-col gap-3">
								<FormLabel>
									{t("policies.overview.form.signature_requirement")}
								</FormLabel>
								<FormControl>
									<Switch
										checked={field.value === "required"}
										onCheckedChange={(checked) => {
											field.onChange(checked ? "required" : "not_required");
										}}
									/>
								</FormControl>
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

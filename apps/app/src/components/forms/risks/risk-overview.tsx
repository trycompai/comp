"use client";

import { updateRiskAction } from "@/actions/risk/update-risk-action";
import { updateRiskSchema } from "@/actions/schema";
import { SelectAssignee } from "@/components/SelectAssignee";
import { STATUS_TYPES, Status, type StatusType } from "@/components/status";
import { useI18n } from "@/locales/client";
import {
	Departments,
	Member,
	type Risk,
	RiskCategory,
	RiskStatus,
	type User,
} from "@comp/db/types";
import { Button } from "@comp/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export function UpdateRiskOverview({
	risk,
	assignees,
}: {
	risk: Risk;
	assignees: (Member & { user: User })[];
}) {
	const t = useI18n();

	const updateRisk = useAction(updateRiskAction, {
		onSuccess: () => {
			toast.success(t("risk.form.update_risk_success"));
		},
		onError: () => {
			toast.error(t("risk.form.update_risk_error"));
		},
	});

	const form = useForm<z.infer<typeof updateRiskSchema>>({
		resolver: zodResolver(updateRiskSchema),
		defaultValues: {
			id: risk.id,
			title: risk.title ?? "",
			description: risk.description ?? "",
			assigneeId: risk.assigneeId ?? null,
			category: risk.category ?? RiskCategory.operations,
			department: risk.department ?? Departments.admin,
			status: risk.status ?? RiskStatus.open,
		},
	});

	const onSubmit = (data: z.infer<typeof updateRiskSchema>) => {
		updateRisk.execute({
			id: data.id,
			title: data.title,
			description: data.description,
			assigneeId: data.assigneeId,
			category: data.category,
			department: data.department,
			status: data.status,
		});
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="assigneeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("common.assignee.label")}</FormLabel>
								<FormControl>
									<SelectAssignee
										assigneeId={field.value ?? null}
										assignees={assignees}
										onAssigneeChange={field.onChange}
										disabled={updateRisk.status === "executing"}
										withTitle={false}
									/>
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
													<Status status={field.value as StatusType} />
												)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{STATUS_TYPES.map((status) => (
												<SelectItem key={status} value={status}>
													<Status status={status} />
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
						name="category"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("risk.form.risk_category")}</FormLabel>
								<FormControl>
									<Select
										{...field}
										value={field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={t("risk.form.risk_category_placeholder")}
											/>
										</SelectTrigger>
										<SelectContent>
											{Object.values(RiskCategory).map((category) => {
												const formattedCategory = category
													.toLowerCase()
													.split("_")
													.map(
														(word) =>
															word.charAt(0).toUpperCase() + word.slice(1),
													)
													.join(" ");
												return (
													<SelectItem key={category} value={category}>
														{formattedCategory}
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
				<div className="flex justify-end mt-4">
					<Button
						type="submit"
						variant="action"
						disabled={updateRisk.status === "executing"}
					>
						{updateRisk.status === "executing" ? (
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

"use client";

import { updateTaskAction } from "@/actions/risks/task/update-task-action";
import { updateTaskSchema } from "@/actions/schema";
import { SelectUser } from "@/components/select-user";
import { STATUS_TYPES, Status, type StatusType } from "@/components/status";
import { useI18n } from "@/locales/client";
import { type Task, TaskStatus, type User } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { Calendar } from "@comp/ui/calendar";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { cn } from "@comp/ui/cn";

export function UpdateTaskForm({
	task,
	users,
}: {
	task: Task;
	users: User[];
}) {
	const t = useI18n();

	const updateTask = useAction(updateTaskAction, {
		onSuccess: () => {
			toast.success("Task updated successfully");
		},
		onError: () => {
			toast.error("Something went wrong, please try again.");
		},
	});

	const form = useForm<z.infer<typeof updateTaskSchema>>({
		resolver: zodResolver(updateTaskSchema),
		defaultValues: {
			id: task.id,
			dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
			assigneeId: task.assigneeId,
			status: task.status ?? TaskStatus.open,
		},
	});

	const onSubmit = (data: z.infer<typeof updateTaskSchema>) => {
		updateTask.execute({
			id: data.id,
			dueDate: data.dueDate ? data.dueDate : undefined,
			assigneeId: data.assigneeId,
			status: data.status as TaskStatus,
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
									<Select
										value={field.value ?? ""}
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
												selectedId={field.value ?? undefined}
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
								<FormLabel>{t("risk.tasks.form.status")}</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder={t("risk.tasks.form.status_placeholder")}
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
						name="dueDate"
						render={({ field }) => (
							<FormItem className="flex flex-col">
								<FormLabel>{t("risk.tasks.form.due_date")}</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
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
													<span>{t("common.date.pick")}</span>
												)}
												<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
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
						disabled={updateTask.status === "executing"}
					>
						{updateTask.status === "executing" ? (
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

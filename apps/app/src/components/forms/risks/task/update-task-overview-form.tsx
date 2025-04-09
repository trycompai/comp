"use client";

import { updateTaskAction } from "@/actions/risks/task/update-task-action";
import { updateTaskSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import type { Task } from "@comp/db/types";
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
import { Textarea } from "@comp/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export function UpdateTaskOverviewForm({
	task,
}: {
	task: Task;
}) {
	const t = useI18n();
	const [open, setOpen] = useQueryState("task-update-overview-sheet");

	const updateTask = useAction(updateTaskAction, {
		onSuccess: () => {
			toast.success(t("risk.form.update_risk_success"));
			setOpen(null);
		},
		onError: () => {
			toast.error(t("risk.form.update_risk_error"));
		},
	});

	const form = useForm<z.infer<typeof updateTaskSchema>>({
		resolver: zodResolver(updateTaskSchema),
		defaultValues: {
			id: task.id,
			title: task.title,
			description: task.description,
			dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
			status: task.status,
			assigneeId: task.assigneeId,
		},
	});

	const onSubmit = (values: z.infer<typeof updateTaskSchema>) => {
		updateTask.execute({
			id: values.id,
			title: values.title,
			description: values.description,
			dueDate: values.dueDate,
			status: values.status,
			assigneeId: values.assigneeId,
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
								<FormLabel>{t("risk.tasks.form.task_title")}</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoFocus
										className="mt-3"
										placeholder={t("risk.tasks.form.task_title_description")}
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
										placeholder={t("risk.tasks.form.description_description")}
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

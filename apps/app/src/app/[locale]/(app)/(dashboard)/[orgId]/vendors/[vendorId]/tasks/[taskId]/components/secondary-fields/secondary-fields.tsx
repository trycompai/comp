"use client";

import { SelectAssignee } from "@/components/SelectAssignee";
import type { Member, Task, User } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { Calendar } from "@comp/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowRightIcon, CalendarIcon, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { updateVendorTaskSchema } from "../../../../actions/schema";
import { updateVendorTaskAction } from "../../../../actions/task/update-task-action";

export default function SecondaryFields({
	task,
	assignees,
}: {
	task: Task & { assignee: { user: User } | null };
	assignees: (Member & { user: User })[];
}) {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>
						<div className="flex items-center justify-between gap-2">
							Task Details
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<TaskSecondaryFieldsForm task={task} assignees={assignees} />
				</CardContent>
			</Card>
		</div>
	);
}

function TaskSecondaryFieldsForm({
	task,
	assignees,
}: {
	task: Task & {
		assignee: { user: User } | null;
	};
	assignees: (Member & { user: User })[];
}) {
	const updateTask = useAction(updateVendorTaskAction, {
		onSuccess: () => {
			toast.success("Task updated successfully");
		},
		onError: () => {
			toast.error("Failed to update task");
		},
	});

	const form = useForm<z.infer<typeof updateVendorTaskSchema>>({
		resolver: zodResolver(updateVendorTaskSchema),
		defaultValues: {
			id: task.id,
			title: task.title,
			description: task.description,
			dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
			status: task.status,
			assigneeId: task.assigneeId || null,
		},
	});

	const onSubmit = (data: z.infer<typeof updateVendorTaskSchema>) => {
		updateTask.execute(data);
	};

	// Function to render status with correct color
	const renderStatus = (status: string) => {
		const getStatusColor = (status: string) => {
			switch (status) {
				case "open":
					return "#ffc107"; // yellow/amber
				case "in_progress":
					return "#0ea5e9"; // blue
				case "completed":
					return "#00DC73"; // green
				case "cancelled":
					return "#64748b"; // gray
				default:
					return "#64748b";
			}
		};

		return (
			<div className="flex items-center gap-2">
				<div
					className="size-2.5 rounded-full"
					style={{ backgroundColor: getStatusColor(status) }}
				/>
				<span>{status.replace("_", " ")}</span>
			</div>
		);
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
								<FormLabel>Assignee</FormLabel>
								<FormControl>
									<SelectAssignee
										assigneeId={field.value}
										assignees={assignees}
										onAssigneeChange={field.onChange}
										disabled={updateTask.status === "executing"}
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
								<FormLabel>Status</FormLabel>
								<FormControl>
									<Select
										value={field.value}
										onValueChange={(value) => {
											field.onChange(value);
											form.handleSubmit(onSubmit)();
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select status">
												{field.value && renderStatus(field.value)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="open">
												{renderStatus("open")}
											</SelectItem>
											<SelectItem value="in_progress">
												{renderStatus("in_progress")}
											</SelectItem>
											<SelectItem value="completed">
												{renderStatus("completed")}
											</SelectItem>
											<SelectItem value="cancelled">
												{renderStatus("cancelled")}
											</SelectItem>
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
								<FormLabel>Due Date</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className={cn(
													"w-full pl-3 text-left font-normal",
													!field.value && "text-muted-foreground",
												)}
											>
												{field.value ? (
													format(field.value, "PPP")
												) : (
													<span>Select a date</span>
												)}
												<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={(date) => {
												field.onChange(date);
												form.handleSubmit(onSubmit)();
											}}
											disabled={(date) =>
												date < new Date(new Date().setHours(0, 0, 0, 0))
											}
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
							<div className="flex items-center">
								Save
								<ArrowRightIcon className="ml-2 h-4 w-4" />
							</div>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}

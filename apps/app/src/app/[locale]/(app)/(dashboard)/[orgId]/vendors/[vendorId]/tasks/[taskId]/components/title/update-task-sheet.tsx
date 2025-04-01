"use client";

import { getOrganizationUsersAction } from "@/actions/organization/get-organization-users-action";
import { useI18n } from "@/locales/client";
import type { Task, VendorStatus } from "@bubba/db/types";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@bubba/ui/accordion";
import { Button } from "@bubba/ui/button";
import { Calendar } from "@bubba/ui/calendar";
import { cn } from "@bubba/ui/cn";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@bubba/ui/form";
import { Input } from "@bubba/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@bubba/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bubba/ui/select";
import { Textarea } from "@bubba/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowRightIcon, CalendarIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { updateVendorTaskSchema } from "../../../../actions/schema";
import { updateVendorTaskAction } from "../../../../actions/task/update-task-action";
import { SelectUser } from "@/components/select-user";

interface User {
	id: string;
	image?: string | null;
	name: string | null;
}

interface UpdateTaskSheetProps {
	task: Task & { user: { name: string | null; image: string | null } | null };
}

export function UpdateTaskSheet({ task }: UpdateTaskSheetProps) {
	const t = useI18n();

	const [users, setUsers] = useState<User[]>([]);
	const [isLoadingUsers, setIsLoadingUsers] = useState(true);
	const [_, setTaskOverviewSheet] = useQueryState("task-overview-sheet");
	const params = useParams<{ taskId: string }>();

	useEffect(() => {
		async function loadUsers() {
			const result = await getOrganizationUsersAction();
			if (result?.data?.success && result?.data?.data) {
				setUsers(result.data.data);
			}
			setIsLoadingUsers(false);
		}

		loadUsers();
	}, []);

	const updateTask = useAction(updateVendorTaskAction, {
		onSuccess: () => {
			toast.success("Task updated successfully");
			setTaskOverviewSheet(null);
		},
		onError: () => {
			toast.error("Failed to update task");
		},
	});

	const form = useForm<z.infer<typeof updateVendorTaskSchema>>({
		resolver: zodResolver(updateVendorTaskSchema),
		defaultValues: {
			id: params.taskId,
			title: task.title,
			description: task.description,
			dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
			status: task.status,
			ownerId: task.userId || undefined,
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
					className="size-2.5"
					style={{ backgroundColor: getStatusColor(status) }}
				/>
				<span>{status.replace("_", " ")}</span>
			</div>
		);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="h-[calc(100vh-250px)] scrollbar-hide overflow-auto">
					<div>
						<Accordion type="multiple" defaultValue={["task"]}>
							<AccordionItem value="task">
								<AccordionTrigger>Task Details</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-4">
										<FormField
											control={form.control}
											name="title"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Title</FormLabel>
													<FormControl>
														<Input
															{...field}
															autoFocus
															className="mt-3"
															placeholder="Enter title"
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
															className="mt-3"
															placeholder="Enter description"
														/>
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
														<PopoverContent
															className="w-auto p-0"
															align="start"
														>
															<Calendar
																mode="single"
																selected={field.value}
																onSelect={field.onChange}
																disabled={(date) =>
																	date <
																	new Date(new Date().setHours(0, 0, 0, 0))
																}
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
											name="ownerId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Assignee</FormLabel>
													<FormControl>
														<Select
															value={field.value}
															onValueChange={(value) => {
																field.onChange(value);
																form.handleSubmit(onSubmit)();
															}}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select assignee" />
															</SelectTrigger>
															<SelectContent>
																<SelectUser
																	isLoading={isLoadingUsers}
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
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>

					<div className="flex justify-end mt-4">
						<Button
							type="submit"
							variant="action"
							disabled={updateTask.status === "executing"}
						>
							<div className="flex items-center justify-center">
								Update
								<ArrowRightIcon className="ml-2 h-4 w-4" />
							</div>
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}

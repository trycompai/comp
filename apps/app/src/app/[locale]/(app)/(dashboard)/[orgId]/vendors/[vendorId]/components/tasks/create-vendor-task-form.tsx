"use client";

import { getOrganizationUsersAction } from "@/actions/organization/get-organization-users-action";
import { createVendorTaskAction } from "../../actions/task/create-task-action";
import { createVendorTaskSchema } from "../../actions/schema";
import { SelectUser } from "@/components/select-user";
import { useI18n } from "@/locales/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@comp/ui/accordion";
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
import { Input } from "@comp/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@comp/ui/popover";
import { Textarea } from "@comp/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowRightIcon, CalendarIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { SelectAssignee } from "@/components/SelectAssignee";
import { Member, User } from "@comp/db/types";

export function CreateVendorTaskForm({
	assignees,
}: {
	assignees: (Member & { user: User })[];
}) {
	const t = useI18n();

	const [_, setCreateVendorTaskSheet] = useQueryState(
		"create-vendor-task-sheet",
	);
	const params = useParams<{ vendorId: string }>();

	const createTask = useAction(createVendorTaskAction, {
		onSuccess: () => {
			toast.success(t("risk.tasks.form.success"));
			setCreateVendorTaskSheet(null);
		},
		onError: () => {
			toast.error(t("risk.tasks.form.error"));
		},
	});

	const form = useForm<z.infer<typeof createVendorTaskSchema>>({
		resolver: zodResolver(createVendorTaskSchema),
		defaultValues: {
			title: "",
			description: "",
			dueDate: new Date(),
			assigneeId: "",
			vendorId: params.vendorId,
		},
	});

	const onSubmit = (data: z.infer<typeof createVendorTaskSchema>) => {
		createTask.execute(data);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="h-[calc(100vh-250px)] scrollbar-hide overflow-auto">
					<div>
						<Accordion type="multiple" defaultValue={["task"]}>
							<AccordionItem value="task">
								<AccordionTrigger>
									{t("risk.tasks.form.title")}
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-4">
										<FormField
											control={form.control}
											name="title"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("risk.tasks.form.task_title")}
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															autoFocus
															className="mt-3"
															placeholder={t(
																"risk.tasks.form.task_title_description",
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
													<FormLabel>
														{t("risk.tasks.form.description")}
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															className="mt-3 min-h-[80px]"
															placeholder={t(
																"risk.tasks.form.description_description",
															)}
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
													<FormLabel>{t("risk.tasks.form.due_date")}</FormLabel>
													<Popover>
														<PopoverTrigger asChild>
															<FormControl>
																<Button
																	variant={"outline"}
																	className={cn(
																		"w-[240px] pl-3 text-left font-normal",
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
														<PopoverContent
															className="w-auto p-0"
															align="start"
														>
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
											name="assigneeId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("common.assignee.label")}</FormLabel>
													<FormControl>
														<SelectAssignee
															assignees={assignees}
															assigneeId={field.value}
															onAssigneeChange={field.onChange}
															withTitle={false}
														/>
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
							disabled={createTask.status === "executing"}
						>
							<div className="flex items-center justify-center">
								{t("common.actions.create")}
								<ArrowRightIcon className="ml-2 h-4 w-4" />
							</div>
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}

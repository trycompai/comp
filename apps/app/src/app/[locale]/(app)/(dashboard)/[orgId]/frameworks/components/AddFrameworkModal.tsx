"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useRouter } from "next/navigation";

import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import { Checkbox } from "@comp/ui/checkbox";
import { cn } from "@comp/ui/cn";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@comp/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import type { FrameworkEditorFramework } from "@comp/db/types";
import { addFrameworksToOrganizationAction } from "@/actions/organization/add-frameworks-to-organization-action"; // Will create this action next
import { addFrameworksSchema } from "@/actions/schema"; // Will create/update this schema

type Props = {
	onOpenChange: (isOpen: boolean) => void;
	availableFrameworks: Pick<
		FrameworkEditorFramework,
		"id" | "name" | "description" | "version" | "visible"
	>[];
	organizationId: string;
};

export function AddFrameworkModal({
	onOpenChange,
	availableFrameworks,
	organizationId,
}: Props) {
	const t = useI18n();
	const router = useRouter();
	const [isExecuting, setIsExecuting] = useState(false);

	const form = useForm<z.infer<typeof addFrameworksSchema>>({
		resolver: zodResolver(addFrameworksSchema),
		defaultValues: {
			frameworkIds: [],
			organizationId: organizationId,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: z.infer<typeof addFrameworksSchema>) => {
		setIsExecuting(true);
		try {
			const result = await addFrameworksToOrganizationAction(data);
			if (result.success) {
				toast.success(t("common.actions.success")); // Assuming a generic success message
				onOpenChange(false);
				router.refresh(); // Refresh page to show new frameworks
			} else {
				toast.error(result.error || t("common.actions.error"));
			}
		} catch (error) {
			toast.error(t("common.actions.error"));
		} finally {
			setIsExecuting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		if (isExecuting && !open) return;
		onOpenChange(open);
	};

	return (
		<DialogContent className="max-w-[455px]">
			<DialogHeader className="my-4">
				<DialogTitle>{t("frameworks.add_modal.title")}</DialogTitle>
				<DialogDescription>
					{availableFrameworks.length > 0
						? t("frameworks.add_modal.description")
						: t("frameworks.add_modal.all_enabled_description")}
				</DialogDescription>
			</DialogHeader>

			{!isExecuting && availableFrameworks.length > 0 && (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
						suppressHydrationWarning
					>
						<FormField
							control={form.control}
							name="frameworkIds"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-sm font-medium">
										{t("frameworks.overview.grid.title")}
									</FormLabel>
									<FormControl>
										<fieldset className="flex flex-col gap-2 select-none">
											<div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
												{availableFrameworks
													.filter(
														(framework) =>
															framework.visible,
													)
													.map((framework) => {
														const frameworkId =
															framework.id;
														return (
															<label
																key={
																	frameworkId
																}
																htmlFor={`add-framework-${frameworkId}`}
																className={cn(
																	"relative flex flex-col p-4 border rounded-sm cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full text-left",
																	field.value.includes(
																		frameworkId,
																	) &&
																		"border-primary bg-primary/5",
																)}
															>
																<div className="flex items-start justify-between">
																	<div>
																		<h3 className="font-semibold">
																			{
																				framework.name
																			}
																		</h3>
																		<p className="text-sm text-muted-foreground mt-1">
																			{
																				framework.description
																			}
																		</p>
																		<p className="text-xs text-muted-foreground/75 mt-2">
																			{`${t("frameworks.overview.grid.version")}: ${framework.version}`}
																		</p>
																	</div>
																	<div>
																		<Checkbox
																			id={`add-framework-${frameworkId}`}
																			checked={field.value.includes(
																				frameworkId,
																			)}
																			className="mt-1"
																			onCheckedChange={(
																				checked,
																			) => {
																				const newValue =
																					checked
																						? [
																								...field.value,
																								frameworkId,
																							]
																						: field.value.filter(
																								(
																									id,
																								) =>
																									id !==
																									frameworkId,
																							);
																				field.onChange(
																					newValue,
																				);
																			}}
																		/>
																	</div>
																</div>
															</label>
														);
													})}
											</div>
										</fieldset>
									</FormControl>
									<FormMessage className="text-xs" />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<div className="space-x-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={isExecuting}
								>
									{t("common.actions.cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										isExecuting ||
										form.getValues("frameworkIds")
											.length === 0 ||
										availableFrameworks.length === 0
									}
									suppressHydrationWarning
								>
									{isExecuting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{t("common.actions.add")}
								</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			)}

			{!isExecuting && availableFrameworks.length === 0 && (
				<div className="py-8 text-center">
					<p className="text-md text-foreground">
						{t("frameworks.add_modal.all_enabled_message")}
					</p>
					<DialogFooter className="mt-8">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							{t("common.actions.close")}
						</Button>
					</DialogFooter>
				</div>
			)}

			{isExecuting && (
				<div className="flex items-center justify-center p-8">
					<Loader2 className="h-12 w-12 animate-spin text-primary" />
					<p className="ml-4 text-muted-foreground">
						{t("frameworks.add_modal.loading")}
					</p>
				</div>
			)}
		</DialogContent>
	);
}

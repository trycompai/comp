"use client";

import { createOrganizationAction } from "@/actions/organization/create-organization-action";
import { organizationSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { FrameworkId, frameworks } from "@comp/data";
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
import { Input } from "@comp/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { LogoSpinner } from "../logo-spinner";

type Props = {
	onOpenChange: (isOpen: boolean) => void;
};

export function CreateOrgModal({ onOpenChange }: Props) {
	const t = useI18n();
	const router = useRouter();
	const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);

	const createOrganization = useAction(createOrganizationAction, {
		onSuccess: (data) => {
			if (data.data?.organizationId) {
				router.push(`/${data.data.organizationId}`);
			}
			onOpenChange(false);
		},
		onError: () => {
			toast.error(t("common.actions.error"), { duration: 5000 });
		},
		onExecute: () => {
			setIsCreatingOrganization(true);
		},
	});

	const form = useForm<z.infer<typeof organizationSchema>>({
		resolver: zodResolver(organizationSchema),
		defaultValues: {
			name: "",
			frameworks: [],
		},
		mode: "onChange",
	});

	const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
		createOrganization.execute(data);
	};

	const isExecuting = createOrganization.status === "executing";

	return (
		<DialogContent
			className="max-w-[455px]"
			hideClose={isExecuting}
			hideOverlayClose={isExecuting}
		>
			<DialogHeader className="my-4">
				{!isExecuting ? (
					<>
						<DialogTitle>{t("onboarding.title")}</DialogTitle>
						<DialogDescription>{t("onboarding.description")}</DialogDescription>
					</>
				) : (
					<>
						<DialogTitle className="sr-only">
							{t("onboarding.title")}
						</DialogTitle>
						<DialogDescription className="sr-only">
							{t("onboarding.description")}
						</DialogDescription>
					</>
				)}
			</DialogHeader>

			{isExecuting && (
				<div className="mt-4">
					<div className="flex items-center justify-center bg-background p-6 md:p-8">
						<div className="relative w-full max-w-[440px] bg-card p-8 shadow-lg">
							<div className="flex flex-col justify-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
								<div className="flex flex-col gap-2 justify-center">
									<LogoSpinner />
									<h2 className="text-xl font-semibold text-center tracking-tight">
										{t("onboarding.trigger.title")}
									</h2>
									<p className="text-center text-sm text-muted-foreground">
										{t("onboarding.trigger.creating")}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{!isExecuting && (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
						suppressHydrationWarning
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-sm font-medium">
										{t("onboarding.fields.name.label")}
									</FormLabel>
									<FormControl>
										<Input
											autoCorrect="off"
											placeholder={t("onboarding.fields.name.placeholder")}
											suppressHydrationWarning
											{...field}
										/>
									</FormControl>
									<FormMessage className="text-xs" />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="frameworks"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-sm font-medium">
										{t("frameworks.overview.grid.title")}
									</FormLabel>
									<FormControl>
										<fieldset className="flex flex-col gap-2 select-none">
											<legend className="sr-only">
												{t("frameworks.overview.grid.title")}
											</legend>
											{Object.entries(frameworks).map(([id, framework]) => {
												const frameworkId = id as FrameworkId;
												return (
													<label
														key={frameworkId}
														htmlFor={`framework-${frameworkId}`}
														className={cn(
															"relative flex flex-col p-4 border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full text-left",
															field.value.includes(frameworkId) &&
																"border-primary bg-primary/5",
														)}
													>
														<div className="flex items-start justify-between">
															<div>
																<h3 className="font-semibold">
																	{framework.name}
																</h3>
																<p className="text-sm text-muted-foreground mt-1">
																	{framework.description}
																</p>
																<p className="text-xs text-muted-foreground/75 mt-2">
																	{`${t("frameworks.overview.grid.version")}: ${framework.version}`}
																</p>
															</div>
															<div>
																<Checkbox
																	id={`framework-${frameworkId}`}
																	checked={field.value.includes(frameworkId)}
																	className="mt-1"
																	onCheckedChange={(checked) => {
																		const newValue = checked
																			? [...field.value, frameworkId]
																			: field.value.filter(
																					(name) => name !== frameworkId,
																				);
																		field.onChange(newValue);
																	}}
																/>
															</div>
														</div>
													</label>
												);
											})}
										</fieldset>
									</FormControl>
									<FormMessage className="text-xs" />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" disabled={isExecuting} className="w-full">
								{isExecuting ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									t("onboarding.submit")
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			)}
		</DialogContent>
	);
}

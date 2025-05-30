"use client";

import { createOrganizationAction } from "@/actions/organization/create-organization-action";
import { organizationSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { authClient } from "@/utils/auth-client";
import type { Organization } from "@comp/db/types";
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
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { LogoSpinner } from "../logo-spinner";
import { useRouter } from "next/navigation";
import type { FrameworkEditorFramework } from "@comp/db/types";

type Props = {
	onOpenChange: (isOpen: boolean) => void;
	frameworks: Pick<
		FrameworkEditorFramework,
		"id" | "name" | "description" | "version" | "visible"
	>[];
};

export function CreateOrgModal({ onOpenChange, frameworks }: Props) {
	const t = useI18n();
	const [isSetup, setIsSetup] = useState(false);
	const router = useRouter();

	const newOrganizationRef = useRef<Pick<
		Organization,
		"id" | "name" | "website"
	> | null>(null);

	const [formData, setFormData] = useState<z.infer<
		typeof organizationSchema
	> | null>(null);

	const createOrganization = useAction(createOrganizationAction, {
		onSuccess: async (data) => {
			if (data.data?.organizationId) {
				newOrganizationRef.current = {
					id: data.data.organizationId,
					name: formData?.name || "",
					website: formData?.website || "",
				};

				router.push(`/${data.data.organizationId}`);
			} else {
				newOrganizationRef.current = null;
			}
		},
		onError: () => {
			toast.error(t("common.actions.error"), { duration: 5000 });
		},
	});

	const form = useForm<z.infer<typeof organizationSchema>>({
		resolver: zodResolver(organizationSchema),
		defaultValues: {
			name: "",
			frameworkIds: [],
		},
		mode: "onChange",
	});

	const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
		await authClient.organization
			.create({
				name: data.name,
				slug: data.name,
			})
			.then(async (organization) => {
				setFormData(data);
				setIsSetup(true);

				createOrganization.execute(data);

				await authClient.organization.setActive({
					organizationId: organization.data?.id,
				});

				onOpenChange(false);
			});
	};

	const isExecuting = createOrganization.status === "executing";

	// Prevent dialog from closing when executing
	const handleOpenChange = (open: boolean) => {
		if (isExecuting && !open) return;
		onOpenChange(open);
	};

	return (
		<DialogContent className="max-w-[455px]">
			<DialogHeader className="my-4">
				{!isExecuting ? (
					<>
						<DialogTitle>{t("onboarding.title")}</DialogTitle>
						<DialogDescription>
							{t("onboarding.description")}
						</DialogDescription>
					</>
				) : (
					<></>
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

			{!isExecuting && !isSetup && (
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
											placeholder={t(
												"onboarding.fields.name.placeholder",
											)}
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
							name="website"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-sm font-medium">
										{t("onboarding.fields.website.label")}
									</FormLabel>
									<FormControl>
										<Input
											autoCorrect="off"
											placeholder={t(
												"onboarding.fields.website.placeholder",
											)}
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
							name="frameworkIds"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-sm font-medium">
										{t("frameworks.overview.grid.title")}
									</FormLabel>
									<FormControl>
										<fieldset className="flex flex-col gap-2 select-none">
											<div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
												{frameworks
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
																htmlFor={`framework-${frameworkId}`}
																className={cn(
																	"relative flex flex-col p-4 border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full text-left",
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
																			id={`framework-${frameworkId}`}
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
																									name,
																								) =>
																									name !==
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
						<div className="mt-6 mb-6">
							<DialogFooter>
								<div className="space-x-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => onOpenChange(false)}
										disabled={isExecuting}
									>
										{t("common.actions.cancel")}
									</Button>
									<Button
										type="submit"
										disabled={
											createOrganization.status ===
											"executing"
										}
										suppressHydrationWarning
									>
										{createOrganization.status ===
											"executing" && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										{t("onboarding.submit")}
									</Button>
								</div>
							</DialogFooter>
						</div>
					</form>
				</Form>
			)}
		</DialogContent>
	);
}

"use client";

import { createOrganizationAction } from "@/actions/organization/create-organization-action";
import { organizationSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { authClient } from "@/utils/auth-client";
import type { FrameworkEditorFramework } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { Checkbox } from "@comp/ui/checkbox";
import { cn } from "@comp/ui/cn";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import { Icons } from "@comp/ui/icons";
import { Input } from "@comp/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendGTMEvent } from "@next/third-parties/google";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { LogoSpinner } from "../logo-spinner";

interface OnboardingClientProps {
	frameworks: Pick<FrameworkEditorFramework, "id" | "name" | "description" | "version">[];
}

export function OnboardingClient({ frameworks }: OnboardingClientProps) {
	const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
	const router = useRouter();
	const t = useI18n();

	const createOrganization = useAction(createOrganizationAction, {
		onSuccess: async () => {
			sendGTMEvent({
				event: "conversion",
			});

			router.push("/");
		},
		onError: () => {
			toast.error(t("common.actions.error"));
		},
		onExecute: () => {
			setIsCreatingOrganization(true);
		},
	});

	const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
		const randomSuffix = Math.floor(
			100000 + Math.random() * 900000,
		).toString();
		const slug = `${data.name
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/[\s_-]+/g, "-")}-${randomSuffix}`;

		await authClient.organization.create({
			name: data.name,
			slug,
		});

		createOrganization.execute({
			...data,
		});
	};

	const form = useForm<z.infer<typeof organizationSchema>>({
		resolver: zodResolver(organizationSchema),
		defaultValues: {
			name: "",
			frameworkIds: [],
			website: "",
		},
		mode: "onChange",
	});

	if (isCreatingOrganization) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
				<div className="relative w-full max-w-[440px] border bg-card p-8 shadow-lg">
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
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
			<div className="relative w-full max-w-[440px] border bg-card rounded-sm p-8 shadow-lg">
				<div className="mb-8 flex justify-between">
					<Link href="/">
						<Icons.Logo />
					</Link>
				</div>

				<div className="mb-8 space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						{t("onboarding.setup")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("onboarding.description")}
					</p>
				</div>

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
											<legend className="sr-only">
												{t(
													"frameworks.overview.grid.title",
												)}
											</legend>
											{frameworks.map(
												(framework) => {
													return (
														<label
															key={framework.id}
															htmlFor={`framework-${framework.id}`}
															className={cn(
																"relative flex flex-col p-4 border rounded-sm cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full text-left",
																field.value.includes(
																	framework.id,
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
																		id={`framework-${framework.id}`}
																		checked={field.value.includes(
																			framework.id,
																		)}
																		className="mt-1"
																		onCheckedChange={(
																			checked,
																		) => {
																			const newValue =
																				checked
																					? [
																						...field.value,
																						framework.id,
																					]
																					: field.value.filter(
																						(
																							currentFrameworkId,
																						) =>
																							currentFrameworkId !==
																							framework.id,
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
												},
											)}
										</fieldset>
									</FormControl>
									<FormMessage className="text-xs" />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							className="w-full"
							disabled={createOrganization.status === "executing"}
							suppressHydrationWarning
						>
							{createOrganization.status === "executing" && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("onboarding.submit")}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}

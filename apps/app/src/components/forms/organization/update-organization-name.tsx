"use client";

import { updateOrganizationNameAction } from "@/actions/organization/update-organization-name-action";
import { organizationNameSchema } from "@/actions/schema";
import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@comp/ui/form";
import { Input } from "@comp/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export function UpdateOrganizationName({
	organizationName,
}: {
	organizationName: string;
}) {
	const t = useI18n();
	const updateOrganizationName = useAction(updateOrganizationNameAction, {
		onSuccess: () => {
			toast.success(t("settings.general.org_name_updated"));
		},
		onError: () => {
			toast.error(t("settings.general.org_name_error"));
		},
	});

	const form = useForm<z.infer<typeof organizationNameSchema>>({
		resolver: zodResolver(organizationNameSchema),
		defaultValues: {
			name: organizationName,
		},
	});

	const onSubmit = (data: z.infer<typeof organizationNameSchema>) => {
		updateOrganizationName.execute(data);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>{t("settings.general.org_name")}</CardTitle>

						<CardDescription>
							<div className="max-w-[600px]">
								{t("settings.general.org_name_description")}
							</div>
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input
											{...field}
											className="max-w-[300px]"
											autoComplete="off"
											autoCapitalize="none"
											autoCorrect="off"
											spellCheck="false"
											maxLength={32}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className="flex justify-between">
						<div className="text-xs text-muted-foreground">
							{t("settings.general.org_name_tip")}
						</div>
						<Button
							type="submit"
							disabled={updateOrganizationName.status === "executing"}
						>
							{updateOrganizationName.status === "executing" ? (
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							) : null}
							{t("common.actions.save")}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}

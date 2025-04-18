"use client";

import { useI18n } from "@/locales/client";
import { authClient } from "@/utils/auth-client";
import { Role } from "@comp/db/types";
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
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import { Input } from "@comp/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { invalidateMembers } from "./invalidateMembers";

const inviteMemberSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	role: z.nativeEnum(Role),
});

type FormValues = z.infer<typeof inviteMemberSchema>;

export function InviteMemberForm() {
	const t = useI18n();
	const session = authClient.useSession();

	const form = useForm<FormValues>({
		resolver: zodResolver(inviteMemberSchema),
		defaultValues: {
			email: "",
			role: "admin",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const response = await authClient.organization.inviteMember({
			email: data.email,
			// @ts-expect-error - Table is correct but authClient is not typed for some reason.
			role: data.role,
		});

		if (response.error) {
			toast.error("Something went wrong");
		} else {
			toast.success(t("settings.team.invitations.invitation_sent"));
			invalidateMembers({
				organizationId:
					session.data?.session.activeOrganizationId ?? "",
			});
			form.reset();
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>{t("settings.team.invite.title")}</CardTitle>
						<CardDescription>
							{t("settings.team.invite.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"settings.team.invite.form.email.label",
										)}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"settings.team.invite.form.email.placeholder",
											)}
											autoComplete="off"
											autoCapitalize="none"
											autoCorrect="off"
											spellCheck="false"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"settings.team.invite.form.role.label",
										)}
									</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"settings.team.invite.form.role.placeholder",
													)}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="owner">
												{t(
													"settings.team.members.role.owner",
												)}
											</SelectItem>
											<SelectItem value="admin">
												{t(
													"settings.team.members.role.admin",
												)}
											</SelectItem>
											<SelectItem value="auditor">
												{t(
													"settings.team.members.role.auditor",
												)}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className="flex justify-between">
						<div />
						<Button
							type="submit"
							disabled={form.formState.isSubmitting}
							variant="default"
						>
							{form.formState.isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("settings.team.invite.button.sending")}
								</>
							) : (
								t("settings.team.invite.button.send")
							)}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}

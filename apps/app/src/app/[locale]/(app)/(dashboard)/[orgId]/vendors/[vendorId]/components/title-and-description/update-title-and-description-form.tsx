"use client";

import { useI18n } from "@/locales/client";
import type { Vendor } from "@comp/db/types";
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
import { updateVendorAction } from "../../actions/update-vendor-action";
import { updateVendorSchema } from "../../actions/schema";

export function UpdateTitleAndDescriptionForm({
	vendor,
}: {
	vendor: Vendor;
}) {
	const t = useI18n();
	const [open, setOpen] = useQueryState("vendor-overview-sheet");

	const updateVendor = useAction(updateVendorAction, {
		onSuccess: () => {
			toast.success(t("vendors.form.update_vendor_success"));
			setOpen(null);
		},
		onError: (error) => {
			console.error("Error updating vendor:", error);
			toast.error(t("vendors.form.update_vendor_error"));
		},
	});

	const form = useForm<z.infer<typeof updateVendorSchema>>({
		resolver: zodResolver(updateVendorSchema),
		defaultValues: {
			id: vendor.id,
			name: vendor.name,
			description: vendor.description,
			category: vendor.category,
			status: vendor.status,
			assigneeId: vendor.assigneeId,
		},
	});

	const onSubmit = (data: z.infer<typeof updateVendorSchema>) => {
		updateVendor.execute({
			id: data.id,
			name: data.name,
			description: data.description,
			category: data.category,
			status: data.status,
			assigneeId: data.assigneeId,
		});
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("vendors.form.vendor_name")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									autoFocus
									className="mt-3"
									placeholder={t("vendors.form.vendor_name_description")}
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
							<FormLabel>{t("vendors.form.vendor_description")}</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									className="mt-3 min-h-[80px]"
									placeholder={t("vendors.form.vendor_description_description")}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end mt-8">
					<Button
						type="submit"
						variant="action"
						disabled={updateVendor.status === "executing"}
					>
						{updateVendor.status === "executing" ? (
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

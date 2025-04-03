"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@comp/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { useToast } from "@comp/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateVendorResidualRisk } from "@/app/[locale]/(app)/(dashboard)/[orgId]/vendors/[vendorId]/actions/update-vendor-residual-risk";
import type { ActionResponse } from "@/types/actions";
import { Impact, Likelihood } from "@prisma/client";
import { useQueryState } from "nuqs";

const formSchema = z.object({
	residualProbability: z.nativeEnum(Likelihood),
	residualImpact: z.nativeEnum(Impact),
});

type FormValues = z.infer<typeof formSchema>;

interface ResidualRiskFormProps {
	vendorId: string;
	initialProbability?: Likelihood;
	initialImpact?: Impact;
	onSuccess?: () => void;
}

export function ResidualRiskForm({
	vendorId,
	initialProbability = Likelihood.very_unlikely,
	initialImpact = Impact.insignificant,
	onSuccess,
}: ResidualRiskFormProps) {
	const t = useI18n();
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [_, setOpen] = useQueryState("residual-risk-sheet");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			residualProbability: initialProbability,
			residualImpact: initialImpact,
		},
	});

	async function onSubmit(values: FormValues) {
		try {
			// Call the server action
			const response = await updateVendorResidualRisk({
				vendorId,
				residualProbability: values.residualProbability,
				residualImpact: values.residualImpact,
			});

			const result = response as unknown as ActionResponse;

			if (!result?.success) {
				toast({
					title: t("common.error"),
					description: result?.error || t("common.unexpected_error"),
					variant: "destructive",
				});
				return; // Stop execution on failure
			}

			// On success:
			// 1. Show success toast
			toast({
				title: t("common.success"),
				description: t("vendors.risks.residual_risk_updated"),
			});

			// 2. Refresh the page data first to ensure it's updated before navigation
			router.refresh();

			// 3. Close the sheet by navigating to the same route without the query parameter
			const params = new URLSearchParams(searchParams);
			params.delete("residual-risk-sheet");
			const newPath = `${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ""}`;
			router.replace(newPath, { scroll: false });

			// 4. Call onSuccess callback if provided (optional, might not be needed if navigation handles updates)
			if (onSuccess) onSuccess();
		} catch (error) {
			console.error("Error submitting form:", error);
			toast({
				title: t("common.error"),
				description: t("common.unexpected_error"),
				variant: "destructive",
			});
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="residualProbability"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{t("vendors.risks.residual_probability")} (Vertical Axis)
							</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue
											placeholder={t("vendors.risks.select_probability")}
										/>
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value={Likelihood.very_likely}>
										{t("vendors.risks.very_likely")} (Top row)
									</SelectItem>
									<SelectItem value={Likelihood.likely}>
										{t("vendors.risks.likely")}
									</SelectItem>
									<SelectItem value={Likelihood.possible}>
										{t("vendors.risks.possible")}
									</SelectItem>
									<SelectItem value={Likelihood.unlikely}>
										{t("vendors.risks.unlikely")}
									</SelectItem>
									<SelectItem value={Likelihood.very_unlikely}>
										{t("vendors.risks.very_unlikely")} (Bottom row)
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="residualImpact"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{t("vendors.risks.residual_impact")} (Horizontal Axis)
							</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue
											placeholder={t("vendors.risks.select_impact")}
										/>
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value={Impact.insignificant}>
										{t("vendors.risks.insignificant")} (Left column)
									</SelectItem>
									<SelectItem value={Impact.minor}>
										{t("vendors.risks.minor")}
									</SelectItem>
									<SelectItem value={Impact.moderate}>
										{t("vendors.risks.moderate")}
									</SelectItem>
									<SelectItem value={Impact.major}>
										{t("vendors.risks.major")}
									</SelectItem>
									<SelectItem value={Impact.severe}>
										{t("vendors.risks.severe")} (Right column)
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					{t("common.save")}
				</Button>
			</form>
		</Form>
	);
}

"use client";

import { updateVendorInherentRisk } from "@/app/[locale]/(app)/(dashboard)/[orgId]/vendors/[vendorId]/actions/update-vendor-inherent-risk";
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
import { Impact, Likelihood } from "@prisma/client";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	inherentProbability: z.nativeEnum(Likelihood),
	inherentImpact: z.nativeEnum(Impact),
});

type FormValues = z.infer<typeof formSchema>;

interface InherentRiskFormProps {
	vendorId: string;
	initialProbability?: Likelihood;
	initialImpact?: Impact;
}

export function InherentRiskForm({
	vendorId,
	initialProbability = Likelihood.very_unlikely,
	initialImpact = Impact.insignificant,
}: InherentRiskFormProps) {
	const t = useI18n();
	const { toast } = useToast();
	const [_, setOpen] = useQueryState("inherent-risk-sheet");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			inherentProbability: initialProbability,
			inherentImpact: initialImpact,
		},
	});

	async function onSubmit(values: FormValues) {
		try {
			await updateVendorInherentRisk({
				vendorId,
				inherentProbability: values.inherentProbability,
				inherentImpact: values.inherentImpact,
			});

			toast({
				title: t("common.success"),
				description: t("vendors.risks.inherent_risk_updated"),
			});

			setOpen("false");
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
					name="inherentProbability"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("vendors.risks.inherent_probability")}</FormLabel>
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
										{t("vendors.risks.very_likely")}
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
										{t("vendors.risks.very_unlikely")}
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="inherentImpact"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("vendors.risks.inherent_impact")}</FormLabel>
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
										{t("vendors.risks.insignificant")}
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
										{t("vendors.risks.severe")}
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end">
					<Button type="submit">{t("common.save")}</Button>
				</div>
			</form>
		</Form>
	);
}

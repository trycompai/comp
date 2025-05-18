"use client";

import { useState, useEffect } from "react";
import { WizardStepper } from "./WizardStepper";
import { WizardQuestion } from "./WizardQuestion";
import { Label } from "@comp/ui/label";
import { Input } from "@comp/ui/input";
import { Checkbox } from "@comp/ui/checkbox";
import { Switch } from "@comp/ui/switch";
import MultipleSelector, {
	Option as MultipleSelectorOption,
} from "@comp/ui/multiple-selector";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	CompanyDetails,
	companyDetailsLatestVersion,
	companyDetailslatestVersionSchema,
} from "../../../lib/models/CompanyDetails";
import { useDebounce } from "use-debounce";
import { updateWizard } from "../actions/updateWizard";
import { WizardIds } from "../types/companyDetails";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@comp/ui/select";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";

const steps = [
	"Company identity",
	"Production stack map",
	"Team & work style",
	"Customer-data footprint",
	"Identity & device baseline",
];

const defaultVendorOptions = [
	{ value: "algolia", label: "Algolia" },
	{ value: "auth0", label: "Auth0" },
	{ value: "aws", label: "AWS (Amazon Web Services)" },
	{ value: "azure", label: "Microsoft Azure" },
	{ value: "better-auth", label: "Better Auth" },
	{ value: "bitbucket", label: "Bitbucket" },
	{ value: "clerk", label: "Clerk" },
	{ value: "cloudflare", label: "Cloudflare" },
	{ value: "datadog", label: "Datadog" },
	{ value: "digitalocean", label: "DigitalOcean" },
	{ value: "firebase", label: "Firebase" },
	{ value: "gcp", label: "Google Cloud Platform" },
	{ value: "github", label: "GitHub" },
	{ value: "gitlab", label: "GitLab" },
	{ value: "grafana", label: "Grafana Cloud" },
	{ value: "heroku", label: "Heroku" },
	{ value: "mailgun", label: "Mailgun" },
	{ value: "meilisearch", label: "Meilisearch" },
	{ value: "mixpanel", label: "Mixpanel" },
	{ value: "netlify", label: "Netlify" },
	{ value: "neon", label: "Neon" },
	{ value: "newrelic", label: "New Relic" },
	{ value: "okta", label: "Okta" },
	{ value: "openai", label: "OpenAI" },
	{ value: "paypal", label: "PayPal" },
	{ value: "planetscale", label: "PlanetScale" },
	{ value: "postmark", label: "Postmark" },
	{ value: "railway", label: "Railway" },
	{ value: "redis", label: "Redis" },
	{ value: "render", label: "Render" },
	{ value: "segment", label: "Segment" },
	{ value: "sendgrid", label: "SendGrid" },
	{ value: "sentry", label: "Sentry" },
	{ value: "stripe", label: "Stripe" },
	{ value: "supabase", label: "Supabase" },
	{ value: "twilio", label: "Twilio" },
	{ value: "upstash", label: "Upstash" },
	{ value: "vercel", label: "Vercel" },
];
const defaultVendorValues = defaultVendorOptions.map((opt) => opt.value);

const dataCategoryOptions = [
	{
		value: "personal",
		label: "Personal info — names, emails, phone numbers",
	},
	{
		value: "payment",
		label: "Payment info — card numbers, billing addresses",
	},
	{
		value: "health",
		label: "Health info — medical or insurance details",
	},
	{
		value: "none",
		label: "We don’t store any of these",
	},
];

const answersSchema = companyDetailslatestVersionSchema;

type Answers = z.infer<typeof answersSchema>;

export const CompanyDetailsWizardForm = ({
	parsedData,
}: {
	parsedData?: CompanyDetails;
}) => {
	const methods = useForm<Answers>({
		resolver: zodResolver(answersSchema),
		defaultValues: {
			companyName: parsedData?.data.companyName,
			companyWebsite: parsedData?.data.companyWebsite,
			vendors: parsedData?.data.vendors,
			headcount: parsedData?.data.headcount,
			workStyle: parsedData?.data.workStyle,
			dataCategories: parsedData?.data.dataCategories,
			storageRegions: parsedData?.data.storageRegions,
			identityProviders: parsedData?.data.identityProviders,
			laptopOS: parsedData?.data.laptopOS,
			mobileDevice: parsedData?.data.mobileDevice,
		},
		mode: "onChange",
	});

	const watchedValues = methods.watch();
	const [debouncedValues] = useDebounce(watchedValues, 600);

	const {
		control,
		handleSubmit,
		trigger,
		formState: { errors },
	} = methods;
	const [step, setStep] = useState(0);
	const router = useRouter();

	const { orgId } = useParams<{ orgId: string }>();

	const onSubmit = (data: Answers) => {
		updateWizard({
			wizardId: WizardIds.CompanyDetails,
			data: {
				version: companyDetailsLatestVersion,
				isCompleted: true,
				data,
			},
		});
	};

	useEffect(() => {
		const save = async () => {
			if (methods.formState.isDirty) {
				const result = await updateWizard({
					wizardId: WizardIds.CompanyDetails,
					data: {
						version: companyDetailsLatestVersion,
						isCompleted: parsedData?.isCompleted || false,
						data: debouncedValues,
					},
				});
				if (result?.success) {
					methods.reset(debouncedValues);
				}
			}
		};
		save();
	}, [debouncedValues]);

	const questionNodes = [
		// 1. Company identity
		<div key="company-identity" className="flex flex-col gap-6">
			<Controller
				name="companyName"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="companyName">Legal entity name</Label>
						<Input
							id="companyName"
							{...field}
							placeholder="Acme Inc."
						/>
						{errors.companyName && (
							<span className="text-destructive text-sm">
								{errors.companyName.message}
							</span>
						)}
					</div>
				)}
			/>
			<Controller
				name="companyWebsite"
				control={control}
				render={({ field }) => {
					const handleChange = (
						e: React.ChangeEvent<HTMLInputElement>,
					) => {
						let value = e.target.value.trim();
						if (value && !/^https?:\/\//i.test(value)) {
							value = `https://${value}`;
						}
						field.onChange(value);
					};
					// Remove https:// from display value for user input, but keep full value in form state
					const displayValue = field.value?.replace(
						/^https?:\/\//i,
						"",
					);
					return (
						<div className="flex flex-col gap-2">
							<Label htmlFor="companyWebsite">
								Website
							</Label>
							<Input
								id="companyWebsite"
								value={displayValue}
								onChange={handleChange}
								placeholder="acme.com"
								prefix="https://"
							/>
							{errors.companyWebsite && (
								<span className="text-destructive text-sm">
									{errors.companyWebsite.message}
								</span>
							)}
						</div>
					);
				}}
			/>
		</div>,
		// 2. Production stack map
		<div key="stack-map" className="flex flex-col gap-6">
			<Label className="mb-2">
				Tell us about your tech stack.
				<span className="block text-xs text-muted-foreground mt-1">
					Select all that apply. If your provider is not listed, add
					your own.
				</span>
			</Label>
			<Controller
				name="vendors"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<MultipleSelector
							className="bg-background"
							options={[
								// Sort vendor options alphabetically at runtime
								...defaultVendorOptions,
								...(field.value || [])
									.filter(
										(v: string) =>
											!defaultVendorValues.includes(v),
									)
									.map((v: string) => ({
										value: v,
										label: v,
									})),
							].sort((a, b) => a.label.localeCompare(b.label))}
							value={(field.value || []).map((v: string) => {
								const found = defaultVendorOptions.find(
									(opt) => opt.value === v,
								);
								return found
									? {
										value: found.value,
										label: found.label,
									}
									: { value: v, label: v };
							})}
							placeholder="Select or add one..."
							onChange={(opts: MultipleSelectorOption[]) =>
								field.onChange(
									opts.map(
										(o: MultipleSelectorOption) => o.value,
									),
								)
							}
							creatable
						/>
						{errors.vendors && (
							<span className="text-destructive text-sm">
								{errors.vendors.message}
							</span>
						)}
					</div>
				)}
			/>
		</div>,
		// 3. Team & work style
		<div key="team-style" className="flex flex-col gap-4">
			<Controller
				name="headcount"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="headcount">
							Headcount (Full-time employees + contractors)
						</Label>
						<Input
							id="headcount"
							type="number"
							min={1}
							{...field}
							onChange={(e) =>
								field.onChange(
									e.target.value === ""
										? ""
										: Number(e.target.value),
								)
							}
						/>
						{errors.headcount && (
							<span className="text-destructive text-sm">
								{errors.headcount.message}
							</span>
						)}
					</div>
				)}
			/>
			<Controller
				name="workStyle"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="workStyle">Work style</Label>
						<Select
							value={field.value}
							onValueChange={field.onChange}
						>
							<SelectTrigger
								id="workStyle"
								className="bg-background"
							>
								<SelectValue placeholder="Select..." />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="remote">
									Fully remote
								</SelectItem>
								<SelectItem value="office">
									Offices/co-working
								</SelectItem>
								<SelectItem value="hybrid">Hybrid</SelectItem>
							</SelectContent>
						</Select>
						{errors.workStyle && (
							<span className="text-destructive text-sm">
								{errors.workStyle.message}
							</span>
						)}
					</div>
				)}
			/>
		</div>,
		// 4. Customer-data footprint
		<div key="data-footprint" className="flex flex-col gap-4">
			<Controller
				name="dataCategories"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label>
							Which kinds of customer data does your product
							store?
							<span className="block text-xs text-muted-foreground mt-1">
								(Select all that apply)
							</span>
						</Label>
						<div className="flex flex-col gap-2">
							{dataCategoryOptions.map((opt) => (
								<div
									key={opt.value}
									className="flex items-center gap-2 cursor-pointer"
								>
									<Checkbox
										checked={field.value.includes(
											opt.value,
										)}
										onCheckedChange={(checked) => {
											if (checked) {
												if (opt.value === "none") {
													field.onChange(["none"]);
												} else {
													field.onChange([
														...field.value.filter(
															(v) => v !== "none",
														),
														opt.value,
													]);
												}
											} else {
												field.onChange(
													field.value.filter(
														(v) => v !== opt.value,
													),
												);
											}
										}}
										id={`data-category-${opt.value}`}
										className="h-4 w-4"
									/>
									<Label
										htmlFor={`data-category-${opt.value}`}
										className="select-none cursor-pointer"
									>
										{opt.label}
									</Label>
								</div>
							))}
						</div>
						{errors.dataCategories && (
							<span className="text-destructive text-sm">
								{errors.dataCategories.message}
							</span>
						)}
					</div>
				)}
			/>
			<Controller
				name="storageRegions"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="storageRegions">
							Primary storage region(s)
						</Label>
						<Input
							id="storageRegions"
							placeholder="e.g. US, EU"
							{...field}
						/>
						{errors.storageRegions && (
							<span className="text-destructive text-sm">
								{errors.storageRegions.message}
							</span>
						)}
					</div>
				)}
			/>
		</div>,
		// 5. Identity & device baseline
		<div key="identity-device" className="flex flex-col gap-4">
			<Controller
				name="identityProviders"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="identityProviders">
							Identity providers you log in with
							<span className="block text-xs text-muted-foreground mt-1">
								e.g. Google Workspace, Okta, Microsoft Entra,
								Supabase Auth
							</span>
						</Label>
						<Input
							id="identityProvidersField"
							{...field}
							placeholder="e.g. Google Workspace, Okta"
						/>
						{errors.identityProviders && (
							<span className="text-destructive text-sm">
								{errors.identityProviders.message}
							</span>
						)}
					</div>
				)}
			/>
			<Controller
				name="laptopOS"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label>What is your laptop OS mix?</Label>
						<MultipleSelector
							className="bg-background"
							options={[
								{ value: "macos", label: "macOS" },
								{ value: "windows", label: "Windows" },
								{ value: "linux", label: "Linux" },
								{ value: "chromeos", label: "ChromeOS" },
							]}
							value={(field.value || []).map((v: string) => {
								const found = [
									{ value: "macos", label: "macOS" },
									{ value: "windows", label: "Windows" },
									{ value: "linux", label: "Linux" },
									{ value: "chromeos", label: "ChromeOS" },
								].find((opt) => opt.value === v);
								return found ? found : { value: v, label: v };
							})}
							placeholder="Select OS types..."
							onChange={(opts: MultipleSelectorOption[]) =>
								field.onChange(
									opts.map(
										(o: MultipleSelectorOption) => o.value,
									),
								)
							}
							creatable={false}
						/>
						{errors.laptopOS && (
							<span className="text-destructive text-sm">
								{errors.laptopOS.message}
							</span>
						)}
					</div>
				)}
			/>
			<Controller
				name="mobileDevice"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor="mobileDevice">
							Do you use mobile devices for work?
						</Label>
						<Switch
							id="mobileDevice"
							checked={field.value}
							onCheckedChange={(checked: boolean) =>
								field.onChange(checked)
							}
						/>
						{errors.mobileDevice && (
							<span className="text-destructive text-sm">
								{errors.mobileDevice.message}
							</span>
						)}
					</div>
				)}
			/>
		</div>,
	];

	// Step validation
	const isStepValid = async () => {
		const fieldsPerStep: (keyof Answers)[][] = [
			["companyName", "companyWebsite"],
			["vendors"],
			["headcount", "workStyle"],
			["dataCategories", "storageRegions"],
			["identityProviders", "laptopOS", "mobileDevice"],
		];
		return await trigger(fieldsPerStep[step]);
	};

	const handleNext = async () => {
		if (step < steps.length - 1) {
			const valid = await isStepValid();
			if (valid) setStep(step + 1);
		} else {
			const valid = await isStepValid();
			if (valid) {
				handleSubmit((data) => {
					onSubmit(data);
					router.push(`/${orgId}/implementation`);
				})();
			}
		}
	};

	const handleBack = () => {
		setStep(Math.max(0, step - 1));
	};

	return (
		<FormProvider {...methods}>
			<form
				onSubmit={handleSubmit(onSubmit)}
				onKeyDown={(e) => {
					if (
						e.key === "Enter" &&
						// Only trigger on Enter if not Shift+Enter and not inside a textarea
						!e.shiftKey &&
						(e.target instanceof HTMLInputElement ||
							e.target instanceof HTMLSelectElement)
					) {
						e.preventDefault();
						handleNext();
					}
				}}
			>
				<Card>
					<CardHeader>
						<CardTitle>
							<WizardStepper steps={steps} currentStep={step} />
						</CardTitle>
					</CardHeader>
					<CardContent>
						<WizardQuestion
							step={step}
							totalSteps={steps.length}
							question={questionNodes[step]}
							onNext={handleNext}
							onBack={handleBack}
							nextDisabled={false}
							showBack={step > 0}
						/>
					</CardContent>
				</Card>
			</form>
		</FormProvider>
	);
};

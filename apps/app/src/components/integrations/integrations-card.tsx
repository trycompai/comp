import { deleteIntegrationConnectionAction } from "@/actions/integrations/delete-integration-connection";
import { retrieveIntegrationSessionTokenAction } from "@/actions/integrations/retrieve-integration-session-token";
import { updateIntegrationSettingsAction } from "@/actions/integrations/update-integration-settings-action";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@comp/ui/accordion";
import { Badge } from "@comp/ui/badge";
import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Input } from "@comp/ui/input";
import { ScrollArea } from "@comp/ui/scroll-area";
import { Sheet, SheetContent } from "@comp/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@comp/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import {
	Calendar,
	Check,
	Clock,
	ExternalLink,
	Globe,
	Loader2,
	Settings,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import {
	IntegrationSettings,
	type IntegrationSettingsItem,
} from "./integration-settings";

// Add a type for the logo
export type LogoType = StaticImageData | { light: string; dark: string };

export function IntegrationsCard({
	id,
	logo,
	name,
	short_description,
	description,
	settings,
	images,
	active,
	installed,
	category,
	installedSettings,
	lastRunAt,
	nextRunAt,
}: {
	id: string;
	logo: LogoType;
	name: string;
	short_description: string;
	description: string;
	settings: IntegrationSettingsItem[] | Record<string, any> | any;
	images: any[];
	active: boolean;
	installed: boolean;
	category: string;
	installedSettings: Record<string, any>;
	lastRunAt?: Date | null;
	nextRunAt?: Date | null;
}) {
	const router = useRouter();

	// Add state to track if we're in edit mode for API key
	const [isEditingApiKey, setIsEditingApiKey] = useState(false);

	// Start with empty component
	const [params, setParams] = useQueryStates({
		app: parseAsString,
		settings: parseAsBoolean,
	});

	const retrieveIntegrationSessionToken = useAction(
		retrieveIntegrationSessionTokenAction,
	);

	const deleteIntegrationConnection = useAction(
		deleteIntegrationConnectionAction,
		{
			onSuccess: () => {
				toast.success("Integration disconnected successfully");
			},
			onError: () => {
				toast.error("Failed to disconnect integration");
			},
		},
	);

	const updateIntegrationSettings = useAction(updateIntegrationSettingsAction, {
		onSuccess: () => {
			toast.success("Settings updated successfully");
			setIsEditingApiKey(false); // Exit edit mode on success
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const [isLoading, setLoading] = useState(false);
	const [apiKeyInput, setApiKeyInput] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const handleConnect = async () => {
		try {
			setLoading(true);
			setIsSaving(true);

			// Use the API key from the state
			const keyToUse = apiKeyInput.trim();
			if (!keyToUse) {
				toast.error("Please enter an API key");
				setLoading(false);
				setIsSaving(false);
				return;
			}

			// First save the API key if provided
			await updateIntegrationSettings.executeAsync({
				integration_id: id,
				option: { id: "api_key", value: keyToUse },
			});

			// Show appropriate message based on whether we're updating or setting for first time
			if (isEditingApiKey) {
				toast.success("API key updated successfully");
			} else {
				toast.success("API key saved successfully");
			}

			// If not already installed (first time setup), then retrieve session token to complete connection
			if (!installed) {
				const res = await retrieveIntegrationSessionToken.executeAsync({
					integrationId: id,
				});
			}

			// Handle success
			setApiKeyInput("");
			setIsEditingApiKey(false);
			router.refresh();
		} catch (error) {
			console.error("Connection error:", error);
			toast.error("Failed to connect integration");
		} finally {
			setLoading(false);
			setIsSaving(false);
		}
	};

	// Function to render the logo
	const renderLogo = () => {
		if (typeof logo === "string") {
			// It's a direct URL string
			return (
				<img
					src={logo}
					alt={name}
					width={48}
					height={48}
					className="rounded-md"
				/>
			);
		}

		if ("light" in logo && "dark" in logo) {
			// It's a URL-based logo object with light/dark variants
			return (
				<>
					<img
						src={logo.light}
						alt={name}
						width={48}
						height={48}
						className="dark:hidden rounded-md"
					/>
					<img
						src={logo.dark}
						alt={name}
						width={48}
						height={48}
						className="hidden dark:block rounded-md"
					/>
				</>
			);
		}

		// It's a StaticImageData or other object with src
		try {
			return (
				<Image
					src={logo as any}
					alt={name}
					width={48}
					height={48}
					className="rounded-md"
				/>
			);
		} catch (error) {
			console.error("Error rendering logo:", error);
			return (
				<div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
					{name.substring(0, 1)}
				</div>
			);
		}
	};

	// Function to get a friendly message about time to midnight UTC
	const getUTCMidnightMessage = (nextRunAt: Date): string => {
		if (!nextRunAt) return "";

		const now = new Date();
		const diffInMs = nextRunAt.getTime() - now.getTime();
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInMinutes = Math.floor(
			(diffInMs % (1000 * 60 * 60)) / (1000 * 60),
		);

		if (diffInHours <= 0 && diffInMinutes <= 0) {
			return "Running soon";
		}

		if (diffInHours === 0) {
			return `Runs in ${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""}`;
		}

		if (diffInMinutes === 0) {
			return `Runs in ${diffInHours} hour${diffInHours !== 1 ? "s" : ""}`;
		}

		return `Runs in ${diffInHours} hour${diffInHours !== 1 ? "s" : ""} and ${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""}`;
	};

	return (
		<Card key={id} className="w-full flex flex-col overflow-hidden">
			<Sheet open={params.app === id} onOpenChange={() => setParams(null)}>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center p-2">
								{renderLogo()}
							</div>
							<div className="flex flex-col gap-1">
								<CardTitle className="flex items-center gap-2 mb-0">
									<p className="text-md font-medium leading-none">{name}</p>
									{installed ? (
										<Badge
											variant="outline"
											className="text-[10px] px-2 py-0 text-green-600 border-green-600"
										>
											Connected
										</Badge>
									) : !active ? (
										<Badge variant="outline" className="text-[10px] px-2 py-0">
											Coming Soon
										</Badge>
									) : null}
								</CardTitle>
								<p className="text-xs text-muted-foreground">{category}</p>
							</div>
						</div>
					</div>

					<div className="relative h-1 w-full bg-secondary/50 rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all"
							style={{ width: installed ? "100%" : "0%" }}
						/>
					</div>
				</CardHeader>

				<CardContent className="pb-4">
					<p className="text-xs text-muted-foreground">{short_description}</p>

					<div className="grid grid-cols-2 gap-4 mt-4">
						<div className="flex flex-col items-start gap-1 border-r pr-3">
							<div className="flex items-center text-muted-foreground">
								<Clock className="h-3.5 w-3.5 mr-1" />
								<span className="text-xs">Last Run</span>
							</div>
							<p className="font-medium text-sm">
								{lastRunAt
									? formatDistanceToNow(new Date(lastRunAt), {
											addSuffix: true,
										})
									: "Never"}
							</p>
						</div>
						<div className="flex flex-col items-start gap-1">
							<div className="flex items-center text-muted-foreground">
								<Settings className="h-3.5 w-3.5 mr-1" />
								<span className="text-xs">Status</span>
							</div>
							<p className="font-medium text-sm">
								{installed ? "Active" : "Not Connected"}
							</p>
						</div>
					</div>
				</CardContent>

				<CardFooter className="py-2 bg-muted/30 border-t flex justify-between">
					<Button
						variant={installed ? "default" : "ghost"}
						size="sm"
						className="w-full"
						disabled={!active}
						onClick={() => setParams({ app: id })}
					>
						{installed ? "Manage" : "Configure"} {name}
					</Button>
				</CardFooter>

				<SheetContent className="h-full p-0 flex flex-col">
					<div className="p-6 pb-4 border-b">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								{renderLogo()}
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-lg font-medium leading-none">{name}</h3>
										{installed && (
											<Badge
												variant="outline"
												className="text-[10px] px-2 py-0 text-green-600 border-green-600"
											>
												Connected
											</Badge>
										)}
									</div>

									<span className="text-xs text-muted-foreground mt-1">
										{category}
									</span>
								</div>
							</div>

							<div>
								{installed && (
									<Button
										variant="outline"
										size="sm"
										className="text-xs"
										onClick={() => {
											deleteIntegrationConnection.executeAsync({
												integrationId: id,
											});
										}}
									>
										{deleteIntegrationConnection.status === "executing"
											? "Disconnecting..."
											: "Disconnect"}
									</Button>
								)}
							</div>
						</div>
					</div>

					{/* Main content area with scroll */}
					<div className="flex-1 overflow-hidden flex flex-col">
						<ScrollArea className="flex-1 px-6">
							<Accordion
								type="multiple"
								defaultValue={["description", "settings", "sync-status"]}
								className="mt-4 space-y-4"
							>
								<AccordionItem
									value="description"
									className="border-0 border-b"
								>
									<AccordionTrigger className="py-3 hover:no-underline">
										<div className="flex items-center gap-2">
											<ExternalLink className="h-3.5 w-3.5 mr-1" />
											<span className="text-sm font-medium">How it works</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="text-muted-foreground text-sm pb-4">
										<div className="rounded-md p-4 border">{description}</div>
									</AccordionContent>
								</AccordionItem>

								{installed && (
									<AccordionItem
										value="sync-status"
										className="border-0 border-b"
									>
										<AccordionTrigger className="py-3 hover:no-underline">
											<div className="flex items-center gap-2">
												<Clock className="h-3.5 w-3.5 mr-1" />
												<span className="text-sm font-medium">Sync Status</span>
											</div>
										</AccordionTrigger>
										<AccordionContent className="text-muted-foreground text-sm pb-4">
											<div className="space-y-4 p-4 border rounded-md">
												<div className="flex items-start gap-2">
													<Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
													<div>
														<div className="flex items-center gap-1">
															<p className="text-sm font-medium text-foreground">
																Last Sync
															</p>
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Globe className="h-3 w-3 text-muted-foreground cursor-help" />
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>
																			Dates are shown in your local timezone
																		</p>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
														</div>
														{lastRunAt ? (
															<p className="text-xs text-muted-foreground">
																{format(new Date(lastRunAt), "PPP 'at' p")}
																<span className="text-xs text-muted-foreground ml-1">
																	(
																	{formatDistanceToNow(new Date(lastRunAt), {
																		addSuffix: true,
																	})}
																	)
																</span>
															</p>
														) : (
															<p className="text-xs text-muted-foreground">
																Never run
															</p>
														)}
													</div>
												</div>

												<div className="flex items-start gap-2">
													<Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
													<div>
														<div className="flex items-center gap-1.5">
															<p className="text-sm font-medium text-foreground">
																Next Sync
															</p>
															<Badge
																variant="outline"
																className="text-[9px] h-4"
															>
																UTC 00:00
															</Badge>
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Globe className="h-3 w-3 text-muted-foreground cursor-help" />
																	</TooltipTrigger>
																	<TooltipContent
																		side="top"
																		align="start"
																		className="max-w-[250px]"
																	>
																		<p>
																			This integration runs at midnight UTC
																			(00:00). Times are converted to your local
																			timezone for display.
																		</p>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
														</div>
														{nextRunAt ? (
															<div className="space-y-0.5">
																<p className="text-xs text-muted-foreground">
																	{format(new Date(nextRunAt), "PPP 'at' p")}
																	<span className="text-xs text-muted-foreground ml-1">
																		(
																		{formatDistanceToNow(new Date(nextRunAt), {
																			addSuffix: true,
																		})}
																		)
																	</span>
																</p>
																<p className="text-xs text-muted-foreground flex items-center gap-1">
																	<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
																	{getUTCMidnightMessage(nextRunAt)}
																</p>
															</div>
														) : (
															<p className="text-xs text-muted-foreground">
																{lastRunAt
																	? "Calculating..."
																	: "Will run at the next midnight UTC"}
															</p>
														)}
													</div>
												</div>
											</div>

											<div className="text-xs border p-3 rounded-md mt-3">
												<p>
													This integration syncs automatically every day at
													midnight UTC (00:00).
												</p>
											</div>
										</AccordionContent>
									</AccordionItem>
								)}

								<AccordionItem value="settings" className="border-0 border-b">
									<AccordionTrigger className="py-3 hover:no-underline">
										<div className="flex items-center gap-2">
											<Settings className="h-3.5 w-3.5 mr-1" />
											<span className="text-sm font-medium">Settings</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="text-muted-foreground text-sm pb-4">
										{/* For Deel, always show the API key input */}
										{id === "deel" ? (
											<div className="space-y-4 p-4 border rounded-md">
												{/* API Key status with checkmark if set */}
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<span className="font-medium text-foreground">
															API Key
														</span>
														{installedSettings?.api_key && (
															<div className="text-green-600">
																<Check className="h-3.5 w-3.5" />
															</div>
														)}
													</div>

													{/* Show update button when key is set and not in edit mode */}
													{installedSettings?.api_key && !isEditingApiKey ? (
														<Button
															variant="outline"
															size="sm"
															onClick={() => setIsEditingApiKey(true)}
														>
															Update
														</Button>
													) : null}
												</div>

												{/* Show input field either when:
													1. No API key is set yet, or
													2. User clicked the update button */}
												{(!installedSettings?.api_key || isEditingApiKey) && (
													<div className="space-y-4">
														<div className="space-y-2">
															<label
																htmlFor={`${id}-api-key`}
																className="text-sm font-medium leading-none"
															>
																{isEditingApiKey
																	? "Update API Key"
																	: "Enter API Key"}
															</label>
															<Input
																id={`${id}-api-key`}
																type="password"
																placeholder="Enter your Deel API key"
																value={apiKeyInput}
																onChange={(e) => setApiKeyInput(e.target.value)}
															/>
															<p className="text-xs text-muted-foreground">
																You can find your API key in your Deel account
																settings.
															</p>
														</div>
														<div className="flex gap-2">
															{isEditingApiKey && (
																<Button
																	type="button"
																	variant="outline"
																	className="flex-1"
																	onClick={() => setIsEditingApiKey(false)}
																>
																	Cancel
																</Button>
															)}
															<Button
																type="button"
																className="flex-1"
																onClick={handleConnect}
																disabled={isSaving}
															>
																{isSaving ? (
																	<>
																		<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																		Saving...
																	</>
																) : isEditingApiKey ? (
																	"Update"
																) : (
																	"Save"
																)}
															</Button>
														</div>
													</div>
												)}
											</div>
										) : Array.isArray(settings) && settings.length > 0 ? (
											<div className="p-4 border rounded-md">
												<IntegrationSettings
													integrationId={id}
													settings={settings as IntegrationSettingsItem[]}
													installedSettings={installedSettings}
												/>
											</div>
										) : (
											<div className="p-4 border rounded-md">
												<p className="text-sm text-muted-foreground">
													No settings available
												</p>
											</div>
										)}
									</AccordionContent>
								</AccordionItem>
							</Accordion>

							{/* Add extra space at the bottom to ensure content doesn't get cut off */}
							<div className="h-20" />
						</ScrollArea>
					</div>

					{/* Footer positioned at the bottom */}
					<div className="p-6 mt-auto border-t border-border bg-muted/30">
						<div className="flex justify-between items-center">
							<p className="text-[10px] text-muted-foreground">
								All integrations on the Comp AI store are open-source and
								peer-reviewed.
							</p>

							<a
								href="mailto:support@trycomp.ai"
								className="text-[10px] text-primary hover:underline flex items-center gap-1"
							>
								<span>Report an issue</span>
								<ExternalLink className="h-3 w-3" />
							</a>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</Card>
	);
}

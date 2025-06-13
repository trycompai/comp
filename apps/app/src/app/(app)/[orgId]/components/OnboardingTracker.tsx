"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogoSpinner } from "@/components/logo-spinner";
import type { Onboarding } from "@comp/db/types";
import { Alert, AlertDescription, AlertTitle } from "@comp/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { AlertTriangle, Rocket, ShieldAlert, Zap } from "lucide-react";

const PROGRESS_MESSAGES = [
	"Learning about your company...",
	"Creating Risks...",
	"Creating Vendors...",
	"Tailoring Policies...",
];

const IN_PROGRESS_STATUSES = [
	"QUEUED",
	"EXECUTING",
	"WAITING_FOR_DEPLOY",
	"REATTEMPTING",
	"FROZEN",
	"DELAYED",
];

const getFriendlyStatusName = (status: string): string => {
	if (!status) return "Unknown";
	return status
		.toLowerCase()
		.replace(/_/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const OnboardingTracker = ({
	onboarding,
	publicAccessToken,
}: {
	onboarding: Onboarding;
	publicAccessToken: string;
}) => {
	const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
	const triggerJobId = onboarding.triggerJobId;
	const { run, error } = useRealtimeRun(triggerJobId ?? undefined, {
		accessToken: publicAccessToken,
	});

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (run && IN_PROGRESS_STATUSES.includes(run.status)) {
			interval = setInterval(() => {
				setCurrentMessageIndex(
					(prevIndex) => (prevIndex + 1) % PROGRESS_MESSAGES.length,
				);
			}, 4000);
		} else {
			setCurrentMessageIndex(0); // Reset when not in progress
		}
		return () => clearInterval(interval);
	}, [run?.status]);

	if (!triggerJobId) {
		return (
			<Card className="w-full max-w-2xl mx-auto my-2 bg-card text-card-foreground shadow-xl">
				<CardHeader className="p-4 text-center">
					<CardTitle className="text-xl font-semibold text-foreground">
						Onboarding Status
					</CardTitle>
					<CardDescription className="text-xs text-muted-foreground mt-0.5">
						Organization setup has not started yet.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 min-h-[80px] flex items-center justify-center">
					<div className="flex flex-col items-center justify-center gap-2 text-center">
						<AlertTriangle className="h-6 w-6 text-warning" />{" "}
						{/* Use theme warning color */}
						<div>
							<p className="text-base font-medium text-warning">
								Awaiting Initiation
							</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								No onboarding process has been started.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const renderStatusContent = () => {
		if (!run && !error) {
			return (
				<div className="flex flex-col items-center justify-center gap-2 text-center">
					<LogoSpinner />
					<div>
						<p className="text-base font-medium text-primary">
							Initializing Status
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Checking the current onboarding status...
						</p>
					</div>
				</div>
			);
		}
		if (!run) {
			return (
				<div className="flex flex-col items-center justify-center gap-2 text-center">
					<AlertTriangle className="h-6 w-6 text-warning" />{" "}
					{/* Use theme warning color */}
					<div>
						<p className="text-base font-medium text-warning">
							Status Unavailable
						</p>{" "}
						{/* Use theme warning color */}
						<p className="text-xs text-muted-foreground mt-1">
							Could not retrieve current onboarding status.
						</p>
					</div>
				</div>
			);
		}

		const friendlyStatus = getFriendlyStatusName(run.status);

		switch (run.status) {
			case "WAITING_FOR_DEPLOY":
			case "QUEUED":
			case "EXECUTING":
			case "REATTEMPTING":
			case "FROZEN":
			case "DELAYED":
				return (
					<div className="flex flex-col items-center justify-center gap-2 text-center">
						<LogoSpinner />
						<div>
							<AnimatePresence mode="wait">
								<motion.p
									key={currentMessageIndex} // Important for AnimatePresence to detect changes
									className="text-base font-medium text-primary h-6" // Added h-6 for consistent height
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3 }}
								>
									{PROGRESS_MESSAGES[currentMessageIndex]}
								</motion.p>
							</AnimatePresence>
							<p className="text-xs text-muted-foreground mt-1">
								We are setting up your organization. This may take a few
								moments.
							</p>
						</div>
					</div>
				);
			case "COMPLETED":
				return (
					<div className="flex flex-col items-center justify-center gap-2 text-center">
						<Rocket className="h-6 w-6 text-chart-positive" />
						<div>
							<p className="text-base font-medium text-chart-positive">
								Setup Complete
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Your organization is ready.
							</p>
						</div>
					</div>
				);
			case "FAILED":
			case "CANCELED":
			case "CRASHED":
			case "INTERRUPTED":
			case "SYSTEM_FAILURE":
			case "EXPIRED":
			case "TIMED_OUT": {
				const errorMessage =
					run.error?.message || "An unexpected issue occurred.";
				const truncatedMessage =
					errorMessage.length > 100
						? `${errorMessage.substring(0, 97)}...`
						: errorMessage;
				return (
					<div className="flex flex-col items-center justify-center gap-2 text-center">
						<ShieldAlert className="h-6 w-6 text-destructive" />{" "}
						<div>
							<p className="text-base font-medium text-destructive">
								Setup <span className="capitalize">{friendlyStatus}</span>
							</p>
							<p className="text-xs text-destructive/80 mt-1">
								{truncatedMessage}
							</p>
						</div>
					</div>
				);
			}
			default: {
				const exhaustiveCheck: never = run.status as never;

				return (
					<div className="flex flex-col items-center justify-center gap-2 text-center">
						<Zap className="h-6 w-6 text-warning" />
						<div>
							<p className="text-base font-medium text-warning">
								Unknown Status
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Received an unhandled status: {exhaustiveCheck}
							</p>
						</div>
					</div>
				);
			}
		}
	};

	if (run?.status === "COMPLETED") {
		return null;
	}

	return (
		<Card className="w-full overflow-hidden rounded-none border-x-0 border-t-0">
			<CardContent className="flex flex-col items-center justify-center bg-background">
				<div className="pt-4 w-full">{renderStatusContent()}</div>
			</CardContent>
		</Card>
	);
};

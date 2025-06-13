"use client";

import type {
	Policy,
	EmployeeTrainingVideoCompletion,
	Member,
} from "@comp/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@comp/ui/tabs";
import { PolicyList } from "./policy";
import { VideoCarousel } from "./video";
import { Button } from "@comp/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import type { FleetPolicy, Host } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { cn } from "@comp/ui/cn";
import { CheckCircle2, XCircle } from "lucide-react";

interface EmployeeTasksListProps {
	policies: Policy[];
	trainingVideos: EmployeeTrainingVideoCompletion[];
	member: Member;
	fleetPolicies: FleetPolicy[];
	host: Host;
}

export const EmployeeTasksList = ({
	policies,
	trainingVideos,
	member,
	fleetPolicies,
	host,
}: EmployeeTasksListProps) => {
	const [isDownloading, setIsDownloading] = useState(false);

	const handleDownload = async () => {
		setIsDownloading(true);
		try {
			const response = await fetch("/api/download-agent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId: member.organizationId,
					employeeId: member.id,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Failed to download agent.");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "compai-device-agent.zip";
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "An unknown error occurred.",
			);
		} finally {
			setIsDownloading(false);
		}
	};

	const hasPolicies = fleetPolicies.length;

	return (
		<Tabs defaultValue="policies">
			<TabsList className="bg-transparent border-b-[1px] w-full justify-start rounded-sm mb-1 p-0 h-auto pb-4">
				<TabsTrigger value="policies">Policies</TabsTrigger>
				<TabsTrigger value="training">Training</TabsTrigger>
				<TabsTrigger value="device">Device</TabsTrigger>
			</TabsList>
			<TabsContent value="policies" className="py-2">
				<PolicyList policies={policies} member={member} />
			</TabsContent>
			<TabsContent value="training" className="py-2">
				<VideoCarousel videos={trainingVideos} member={member} />
			</TabsContent>
			<TabsContent value="device" className="py-2">
				{hasPolicies ? (
					<Card>
						<CardHeader>
							<CardTitle>{host.computer_name}'s Policies</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{fleetPolicies.map((policy) => (
								<div
									key={policy.id}
									className={cn(
										"flex items-center justify-between rounded-md border border-l-4 p-3 hover:bg-muted/50 transition-colors shadow-sm",
										policy.response === "pass"
											? "border-l-green-500"
											: "border-l-red-500",
									)}
								>
									<p className="font-medium">{policy.name}</p>
									{policy.response === "pass" ? (
										<div className="flex items-center gap-1 text-green-600">
											<CheckCircle2 size={16} />
											<span>Pass</span>
										</div>
									) : (
										<div className="flex items-center gap-1 text-red-600">
											<XCircle size={16} />
											<span>Fail</span>
										</div>
									)}
								</div>
							))}
						</CardContent>
					</Card>
				) : (
					<Button disabled={isDownloading} onClick={handleDownload}>
						{isDownloading ? "Downloading..." : "Download Agent"}
					</Button>
				)}
			</TabsContent>
		</Tabs>
	);
};

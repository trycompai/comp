"use client";

import type { Policy, Member } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@comp/ui/card";
import type { JSONContent } from "@tiptap/react";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { PolicyEditor } from "./PolicyEditor";

interface PolicyCardProps {
	policy: Policy;
	onNext?: () => void;
	onComplete?: () => void;
	onClick?: () => void;
	member: Member;
	isLastPolicy?: boolean;
}

export function PolicyCard({
	policy,
	onNext,
	onComplete,
	onClick,
	member,
	isLastPolicy,
}: PolicyCardProps) {
	const [isAccepted, setIsAccepted] = useState(
		policy.signedBy.includes(member.id),
	);

	const handleAccept = () => {
		setIsAccepted(true);
		onComplete?.();
	};

	return (
		<Card className="shadow-md w-full max-h-[calc(100vh-450px)] flex flex-col relative">
			{isAccepted && (
				<div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-10 flex items-center justify-center">
					<div className="text-center space-y-4">
						<Check className="h-12 w-12 text-primary mx-auto" />
						<h3 className="text-xl font-semibold">Policy Accepted</h3>
						<p className="text-muted-foreground">
							You have accepted this policy
						</p>
						<div className="flex gap-2 justify-center">
							<Button
								variant="outline"
								onClick={() => setIsAccepted(false)}
								className="gap-2"
							>
								View Again
							</Button>
							{!isLastPolicy && (
								<Button onClick={onNext} className="gap-2">
									Next Policy
									<ArrowRight className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
				</div>
			)}
			<CardHeader>
				<CardTitle className="text-2xl">{policy.name}</CardTitle>
				<CardDescription className="text-muted-foreground">
					{policy.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="w-full flex-1 overflow-y-auto">
				<div className="border-t pt-6 w-full">
					<div className="max-w-none">
						<PolicyEditor content={policy.content as JSONContent[]} />
					</div>
					<p className="text-sm text-muted-foreground mt-4">
						Status: {policy.status}{" "}
						{policy.updatedAt && (
							<span>
								(Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
								)
							</span>
						)}
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex justify-between items-center">
				<div className="flex items-center gap-2">
					{policy.updatedAt && (
						<p className="text-sm text-muted-foreground">
							Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button onClick={handleAccept}>Accept Policy</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

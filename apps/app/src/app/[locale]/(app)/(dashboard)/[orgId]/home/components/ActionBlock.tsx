"use client";

import Link from "next/link";
import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Button } from "@comp/ui/button";
import type { ActionBlockProps } from "../types/ActionBlock.types";
import { authClient } from "@/utils/auth-client";
import { useParams } from "next/navigation";

export function ActionBlock({
	id,
	title,
	description,
	buttonLabel,
	buttonLink,
}: ActionBlockProps) {
	const { orgId } = useParams<{ orgId: string }>();
	const linkWithOrgReplaced = buttonLink.replace(":organizationId", orgId);

	const [isDone, setIsDone] = useState(false);

	function handleMarkAsDone() {
		setIsDone(true);
	}

	return (
		<Card className="relative overflow-hidden">
			<div className={isDone ? "blur-sm" : ""}>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
				<CardContent className="flex items-center justify-between space-x-4">
					<Button asChild variant={isDone ? "secondary" : "default"}>
						<Link href={linkWithOrgReplaced}>{buttonLabel}</Link>
					</Button>

					<Button
						variant="outline"
						onClick={handleMarkAsDone}
						disabled={isDone}
					>
						{isDone ? "Done" : "Mark as Done"}
					</Button>
				</CardContent>
			</div>

			{isDone && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50">
					<span className="text-xl font-semibold text-primary">Completed</span>
				</div>
			)}
		</Card>
	);
}

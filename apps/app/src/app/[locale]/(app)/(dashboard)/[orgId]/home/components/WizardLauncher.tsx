"use client";

import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Button } from "@comp/ui/button";
import type { WizardLauncherProps } from "../types/WizardLauncher.types";
import { useParams } from "next/navigation";

export function WizardLauncher({
	id,
	title,
	description,
	buttonLabel,
	wizardId,
}: WizardLauncherProps) {
	const { locale, orgId } = useParams<{ locale: string; orgId: string }>();
	const wizardPath = `/${locale}/${orgId}/home/wizard/${wizardId}`;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<Button asChild>
					<Link href={wizardPath}>{buttonLabel}</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

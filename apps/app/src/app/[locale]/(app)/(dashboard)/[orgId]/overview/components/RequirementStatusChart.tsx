"use client";

import { useI18n } from "@/locales/client";
import type { Framework, OrganizationFramework } from "@bubba/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Progress } from "@bubba/ui/progress";
import Link from "next/link";
import { useParams } from "next/navigation";

interface FrameworkWithCompliance {
	framework: OrganizationFramework & {
		framework: Framework;
	};
	compliance: number;
}

interface Props {
	frameworks: (OrganizationFramework & {
		framework: Framework;
	})[];
	frameworksWithCompliance: FrameworkWithCompliance[];
}

// Individual FrameworkCard component
function FrameworkCard({
	framework,
	compliance,
}: {
	framework: OrganizationFramework & { framework: Framework };
	compliance: number;
}) {
	const { orgId } = useParams<{ orgId: string }>();

	return (
		<Link
			href={`/${orgId}/overview/frameworks/${framework.framework.id}`}
			className="flex items-start gap-4 rounded-lg p-4 hover:bg-muted/40 transition-colors duration-200"
		>
			<div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
				<div className="text-lg font-bold text-muted-foreground">
					{framework.framework.name.substring(0, 2).toUpperCase()}
				</div>
			</div>
			<div className="flex-1 space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">{framework.framework.name}</h3>
					<span className="text-sm font-medium text-muted-foreground">
						{compliance}% Compliant
					</span>
				</div>
				<Progress
					value={compliance}
					className="h-2 bg-secondary [&>div]:bg-primary"
				/>
			</div>
		</Link>
	);
}

// Main component
export function RequirementStatus({
	frameworks,
	frameworksWithCompliance,
}: Props) {
	const t = useI18n();

	if (!frameworks.length || !frameworksWithCompliance.length) return null;

	return (
		<Card className="select-none">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("frameworks.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-8">
					{/* Framework List */}
					<div className="space-y-6">
						{frameworksWithCompliance.map(({ framework, compliance }) => (
							<FrameworkCard
								key={framework.framework.id}
								framework={framework}
								compliance={compliance}
							/>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

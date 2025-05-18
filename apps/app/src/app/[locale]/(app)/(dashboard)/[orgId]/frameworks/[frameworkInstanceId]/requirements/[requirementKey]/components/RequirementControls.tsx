"use client";

import { useI18n } from "@/locales/client";
import type { Requirement } from "@comp/data";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { FrameworkInstanceWithControls } from "../../../../types";
import { RequirementControlsTable } from "./table/RequirementControlsTable";
import type { Control, RequirementMap, Task } from "@comp/db/types";

interface RequirementControlsProps {
	requirement: Requirement;
	tasks: (Task & { controls: Control[] })[];
	relatedControls: (RequirementMap & { control: Control })[];
}

export function RequirementControls({
	requirement,
	tasks,
	relatedControls,
}: RequirementControlsProps) {
	const t = useI18n();


	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div>
							<span className="text-sm text-muted-foreground">
								{t("frameworks.requirements.requirement")}
							</span>
							<h1 className="text-2xl font-semibold">
								{requirement.name}
							</h1>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{requirement.description}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						{t("frameworks.controls.title")} (
						{relatedControls.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<RequirementControlsTable
						controls={relatedControls.map((control) => control.control)}
						tasks={tasks}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

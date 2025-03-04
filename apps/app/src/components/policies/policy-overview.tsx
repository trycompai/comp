"use client";

import { useI18n } from "@/locales/client";
import type { OrganizationPolicy, Policy, User } from "@bubba/db";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Icons } from "@bubba/ui/icons";
import { PencilIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { PolicyOverviewSheet } from "./sheets/policy-overview-sheet";
import { UpdatePolicyOverview } from "../forms/policies/policy-overview";

export function PolicyOverview({
	policy,
	users,
}: {
	policy: OrganizationPolicy & {
		policy: Policy;
	};
	users: User[];
}) {
	const t = useI18n();
	const [open, setOpen] = useQueryState("policy-overview-sheet");

	return (
		<div className="space-y-4">
			<Alert>
				<Icons.Policies className="h-4 w-4" />
				<AlertTitle>
					<div className="flex items-center justify-between gap-2">
						{policy.policy.name}
						<Button
							size="icon"
							variant="ghost"
							className="p-0 m-0 size-auto"
							onClick={() => setOpen("true")}
						>
							<PencilIcon className="h-3 w-3" />
						</Button>
					</div>
				</AlertTitle>
				<AlertDescription className="mt-4">
					{policy.policy.description}
				</AlertDescription>
			</Alert>

			<Card>
				<CardHeader>
					<CardTitle>
						<div className="flex items-center justify-between gap-2">
							{t("policies.overview.title")}
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<UpdatePolicyOverview organizationPolicy={policy} users={users} />
				</CardContent>
			</Card>

			<PolicyOverviewSheet policy={policy} />
		</div>
	);
}

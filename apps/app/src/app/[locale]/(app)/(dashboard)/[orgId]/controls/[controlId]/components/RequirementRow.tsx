import type { FrameworkId, RequirementMap } from "@comp/db/types";
import { TableCell, TableRow } from "@comp/ui/table";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { getRequirementDetails } from "../../../frameworks/lib/getRequirementDetails";

interface RequirementRowProps {
	requirement: RequirementMap;
}

export function RequirementRow({ requirement }: RequirementRowProps) {
	const router = useRouter();
	const params = useParams();
	const [frameworkId, requirementId] = requirement.requirementId.split("_");
	const orgId = params.orgId as string;

	const requirementDetails = getRequirementDetails(
		frameworkId as FrameworkId,
		requirementId,
	);

	const href = `/${orgId}/frameworks/${requirement.frameworkInstanceId}/requirements/${requirementId}`;

	return (
		<TableRow
			onClick={() => router.push(href)}
			className="group hover:bg-muted/50 transition-colors cursor-pointer"
		>
			<TableCell className="font-medium">{requirementId}</TableCell>
			<TableCell>{requirementDetails?.name ?? ""}</TableCell>
			<TableCell>{requirementDetails?.description ?? ""}</TableCell>
		</TableRow>
	);
}

import { notFound, redirect } from "next/navigation";
import { ControlDetailsClientPage } from "./ControlDetailsClientPage";
import type { FrameworkEditorControlTemplate } from "@prisma/client";
import { db } from "@comp/db";
import { isAuthorized } from "@/app/lib/utils";

// Define a more specific type for the control details, including relations
// Prisma will generate a similar type, but defining it explicitly can be helpful for props
export type ControlDetailsWithRelations = FrameworkEditorControlTemplate & {
	policyTemplates: { id: string; name: string }[];
	requirements: {
		id: string;
		name: string;
		framework: { id: string; name: string | null } | null; // Added id to framework
	}[];
	taskTemplates: { id: string; name: string }[];
};

async function getControlDetails(
	id: string,
): Promise<ControlDetailsWithRelations | null> {
	const control = await db.frameworkEditorControlTemplate.findUnique({
		where: { id },
		include: {
			policyTemplates: {
				select: {
					id: true,
					name: true,
				},
				orderBy: { name: "asc" }, // Optional: sort related items
			},
			requirements: {
				select: {
					id: true,
					name: true,
					framework: {
						select: {
							id: true, // Ensure framework id is selected
							name: true,
						},
					},
				},
				orderBy: { name: "asc" }, // Optional: sort related items
			},
			taskTemplates: {
				select: {
					id: true,
					name: true,
				},
				orderBy: { name: "asc" }, // Optional: sort related items
			},
		},
	});
	return control;
}

interface ControlDetailsPageProps {
	params: {
		controlId: string;
	};
}

export default async function ControlDetailsPage({
	params,
}: ControlDetailsPageProps) {
	const isAllowed = await isAuthorized();

	if (!isAllowed) {
		redirect("/auth");
	}

	const controlDetails = await getControlDetails(params.controlId);

	if (!controlDetails) {
		notFound();
	}

	// Ensure the props passed to client component match its expectation or update client component props
	return <ControlDetailsClientPage controlDetails={controlDetails} />;
}

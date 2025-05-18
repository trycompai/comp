import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { Role, TaskStatus } from "@comp/db/types";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@comp/ui/breadcrumb";
import { headers } from "next/headers";
import { TaskList } from "./components/TaskList";

// Force dynamic rendering to ensure searchParams are always fresh
export const dynamic = "force-dynamic";

// Use cached versions of data fetching functions
export default async function TasksPage({
	searchParams,
	params,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
	params: Promise<{ orgId: string }>;
}) {
	// Extract specific params to pass down
	const { orgId } = await params;
	const allSearchParams = await searchParams;
	const statusFilter = allSearchParams?.status as string | undefined;

	const tasks = await getTasks(statusFilter);
	const members = await getMembersWithMetadata();

	return (
		<main className="mt-4">
			{/* Render Breadcrumbs only if we are in the tasks section */}
			<div className="border-b pb-4">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href={`/${orgId}/tasks`}>
								Tasks
							</BreadcrumbLink>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<TaskList tasks={tasks} members={members} />
		</main>
	);
}

const getTasks = async (statusParam?: string) => {
	console.log("Fetching tasks...", {
		statusParam,
	});
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const orgId = session?.session.activeOrganizationId;

	if (!orgId) {
		return [];
	}

	const whereClause: {
		organizationId: string;
		status?: TaskStatus;
	} = { organizationId: orgId };

	// Filter by Status (using passed argument)
	if (typeof statusParam === "string" && statusParam in TaskStatus) {
		whereClause.status = statusParam as TaskStatus;
		console.log(`Filtering by status: ${whereClause.status}`);
	}

	const tasks = await db.task.findMany({
		where: whereClause,
		orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
	});
	return tasks;
};

const getMembersWithMetadata = async () => {
	console.log("Fetching members...");
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const orgId = session?.session.activeOrganizationId;

	if (!orgId) {
		return [];
	}

	const members = await db.member.findMany({
		where: {
			organizationId: orgId,
			role: {
				notIn: [Role.employee, Role.auditor],
			},
		},
		include: {
			user: true,
		},
	});

	return members;
};

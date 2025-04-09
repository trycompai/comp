import { TaskOverview } from "@/components/risks/tasks/task-overview";
import { useUsers } from "@/hooks/use-users";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
interface PageProps {
	params: Promise<{ riskId: string; taskId: string }>;
}

export default async function RiskPage({ params }: PageProps) {
	const { riskId, taskId } = await params;
	const task = await getTask(riskId, taskId);
	const users = await useUsers();

	if (!task) {
		redirect("/");
	}

	return (
		<div className="flex flex-col gap-4">
			<TaskOverview task={task} users={users} />
		</div>
	);
}

const getTask = cache(async (riskId: string, taskId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		redirect("/");
	}

	const task = await db.task.findUnique({
		where: {
			relatedId: riskId,
			relatedType: "risk",
			id: taskId,
			organizationId: session.session.activeOrganizationId,
		},
		include: {
			assignee: true,
		},
	});

	return task;
});

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("risk.tasks.task_overview"),
	};
}

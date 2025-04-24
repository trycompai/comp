import { IntegrationsHeader } from "@/components/integrations/integrations-header";
import { IntegrationsServer } from "@/components/integrations/integrations.server";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function IntegrationsPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setStaticParamsLocale(locale);

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.session.activeOrganizationId) {
		return redirect("/");
	}

	const [organization] = await Promise.all([
		db.organization.findUnique({
			where: {
				id: session?.session.activeOrganizationId ?? "",
			},
		}),
	]);

	if (!organization) {
		return redirect("/");
	}

	return (
		<div className="mt-4 max-w-[1200px] m-auto flex flex-col gap-4">
			<IntegrationsHeader />

			<IntegrationsServer />
		</div>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("sidebar.integrations"),
	};
}

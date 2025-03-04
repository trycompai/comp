import { auth } from "@/auth";
import { PolicyComment } from "@/components/policies/policy-comments";
import { PolicyOverview } from "@/components/policies/policy-overview";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

export default async function PolicyDetails({
	params,
}: {
	params: Promise<{ locale: string; policyId: string }>;
}) {
	const { locale, policyId } = await params;

	setStaticParamsLocale(locale);

	const session = await auth();
	const organizationId = session?.user.organizationId;

	if (!organizationId) {
		redirect("/");
	}

	const policy = await getPolicy(policyId, organizationId);
	const users = await getUsers(organizationId);

	if (!policy) {
		redirect("/policies");
	}

	return (
		<div className="flex flex-col gap-4">
			<PolicyOverview policy={policy} users={users} />
			<PolicyComment policy={policy} users={users} />
		</div>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; policyId: string }>;
}): Promise<Metadata> {
	const { locale } = await params;

	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("sub_pages.policies.policy_details"),
	};
}

const getPolicy = unstable_cache(
	async (policyId: string, organizationId: string) => {
		const policy = await db.organizationPolicy.findUnique({
			where: { id: policyId, organizationId },
			include: {
				policy: true,
				PolicyComments: true,
			},
		});
		return policy;
	},
	["policy-details"],
	{ tags: ["policies", "policy-details"] },
);

const getUsers = unstable_cache(
	async (organizationId: string) => {
		const users = await db.user.findMany({
			where: { organizationId: organizationId },
		});

		return users;
	},
	["users-cache"],
);

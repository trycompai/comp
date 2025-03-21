import { auth } from "@/auth";
import { ApiKeysTable } from "@/components/tables/api-keys";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";

export default async function ApiKeysPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	const apiKeys = await getApiKeys();

	return (
		<div className="mx-auto max-w-7xl">
			<ApiKeysTable apiKeys={apiKeys} />
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
		title: t("settings.api_keys.title"),
	};
}

const getApiKeys = async () => {
	const session = await auth();

	if (!session?.user.organizationId) {
		return [];
	}

	const apiKeys = await db.organizationApiKey.findMany({
		where: {
			organizationId: session.user.organizationId,
			isActive: true,
		},
		select: {
			id: true,
			name: true,
			createdAt: true,
			expiresAt: true,
			lastUsedAt: true,
			isActive: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return apiKeys.map((key) => ({
		...key,
		createdAt: key.createdAt.toISOString(),
		expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
		lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
	}));
};

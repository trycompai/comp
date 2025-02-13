import { auth } from "@/auth";
import { DeleteOrganization } from "@/components/forms/organization/delete-organization";
import { UpdateOrganizationName } from "@/components/forms/organization/update-organization-name";
import { UpdateOrganizationWebsite } from "@/components/forms/organization/update-organization-website";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";

export default async function OrganizationSettings({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();

  const [organization] = await Promise.all([
    db.organization.findUnique({
      where: {
        id: session?.user.organizationId,
      },
      select: {
        name: true,
        website: true,
        id: true,
      },
    }),
  ]);

  if (!organization) {
    return redirect("/");
  }

  return (
    <div className="space-y-12">
      <UpdateOrganizationName organizationName={organization.name} />
      <UpdateOrganizationWebsite organizationWebsite={organization.website} />
      <DeleteOrganization organizationId={organization.id} />
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
    title: t("sidebar.settings"),
  };
}

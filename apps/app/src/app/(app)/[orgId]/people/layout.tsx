import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/utils/auth";

import { db } from "@trycompai/db";
import { SecondaryMenu } from "@trycompai/ui/secondary-menu";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return redirect("/");
  }

  // Fetch all members first
  const allMembers = await db.member.findMany({
    where: {
      organizationId: orgId,
    },
  });

  const employees = allMembers.filter((member) => {
    const roles = member.role.includes(",")
      ? member.role.split(",")
      : [member.role];
    return roles.includes("employee") || roles.includes("contractor");
  });

  return (
    <div className="m-auto max-w-[1200px] py-8">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/people/all`,
            label: "People",
            activeOverrideIdPrefix: "mem_",
          },
          ...(employees.length > 0
            ? [
                {
                  path: `/${orgId}/people/dashboard`,
                  label: "Employee Tasks",
                },
              ]
            : []),
          {
            path: `/${orgId}/people/devices`,
            label: "Employee Devices",
          },
        ]}
      />

      <main>{children}</main>
    </div>
  );
}

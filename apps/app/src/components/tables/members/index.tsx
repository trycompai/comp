import { auth } from "@/auth";
import { db } from "@bubba/db";
import { redirect } from "next/navigation";
import type { MemberType } from "./columns";
import { DataTable } from "./data-table";

export async function MembersTable() {
  const session = await auth();

  const members = await db.organizationMember.findMany({
    where: {
      organizationId: session?.user.organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
          organizationId: true,
        },
      },
    },
  });

  if (!session?.user) {
    redirect("/");
  }

  return (
    <DataTable data={members as MemberType[]} currentUser={session.user} />
  );
}

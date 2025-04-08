import { auth } from "@/app/lib/auth";
import { db } from "@comp/db";
import { cache } from "react";
import { headers } from "next/headers";
import { EmployeeTasksList } from "./EmployeeTasksList";

export async function Overview() {
  const policies = await getPolicies();
  const trainingVideos = await getTrainingVideos();
  const member = await getMember();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Welcome back, {member.user.name}</h1>
        <p className="text-sm">Please complete the following tasks</p>
      </div>
      <EmployeeTasksList
        policies={policies}
        trainingVideos={trainingVideos}
        member={member}
      />
    </div>
  );
}

const getMember = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      role: "employee",
    },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw new Error("Unauthorized");
  }

  return member;
});

const getPolicies = cache(async () => {
  const member = await getMember();
  const organizationId = member.organizationId;

  if (!organizationId) {
    throw new Error("Unauthorized");
  }

  const policies = await db.policy.findMany({
    where: {
      organizationId,
      isRequiredToSign: true,
    },
  });

  return policies;
});

const getTrainingVideos = cache(async () => {
  const member = await getMember();

  if (!member) {
    throw new Error("Unauthorized");
  }

  const organizationId = member.organizationId;

  if (!organizationId) {
    throw new Error("Unauthorized");
  }

  const trainingVideos = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: member.id,
    },
  });

  return trainingVideos;
});

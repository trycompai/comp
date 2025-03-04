import { db } from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { DepartmentChart } from "./department-chart";
import { unstable_cache } from "next/cache";

const ALL_DEPARTMENTS = ["none", "admin", "gov", "hr", "it", "itsm", "qms"];

interface Props {
  organizationId: string;
}

export async function RisksByDepartment({ organizationId }: Props) {
  const risks = await getRisksByDepartment(organizationId);

  const data = ALL_DEPARTMENTS.map((dept) => {
    const found = risks.find(
      (risk) =>
        (risk.department || "none").toLowerCase() === dept.toLowerCase(),
    );

    return {
      name: dept === "none" ? "None" : dept.toUpperCase(),
      value: found ? found._count : 0,
    };
  }).sort((a, b) => b.value - a.value);

  // Separate departments with values > 0 and departments with values = 0
  const departmentsWithValues = data.filter((dept) => dept.value > 0);
  const departmentsWithoutValues = data.filter((dept) => dept.value === 0);

  // Determine which departments to show
  let departmentsToShow = [...departmentsWithValues];

  // If we have fewer than 4 departments with values, show up to 2 departments with no values
  if (departmentsWithValues.length < 4 && departmentsWithoutValues.length > 0) {
    departmentsToShow = [
      ...departmentsWithValues,
      ...departmentsWithoutValues.slice(0, 2),
    ];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risks by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <DepartmentChart data={departmentsToShow} showEmptyDepartments={true} />
      </CardContent>
    </Card>
  );
}

const getRisksByDepartment = unstable_cache(
  async (organizationId: string) => {
    const risksByDepartment = await db.risk.groupBy({
      by: ["department"],
      where: { organizationId },
      _count: true,
    });

    return risksByDepartment;
  },
  ["risks-by-department"],
  { tags: ["risks", "departments"] },
);

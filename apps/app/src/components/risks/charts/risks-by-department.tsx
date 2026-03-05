import { serverApi } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { DepartmentChart } from './department-chart';

const ALL_DEPARTMENTS = ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'];

interface DepartmentStat {
  department: string | null;
  _count: number;
}

export async function RisksByDepartment() {
  const res = await serverApi.get<{ data: DepartmentStat[] }>(
    '/v1/risks/stats/by-department',
  );
  const risks = Array.isArray(res.data?.data) ? res.data.data : [];

  const data = ALL_DEPARTMENTS.map((dept) => {
    const found = risks.find(
      (risk) => (risk.department || 'none').toLowerCase() === dept.toLowerCase(),
    );

    return {
      name: dept === 'none' ? 'None' : dept.toUpperCase(),
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
    departmentsToShow = [...departmentsWithValues, ...departmentsWithoutValues.slice(0, 2)];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{'Risks by Department'}</CardTitle>
      </CardHeader>
      <CardContent>
        <DepartmentChart data={departmentsToShow} showEmptyDepartments={true} />
      </CardContent>
    </Card>
  );
}

import { db } from '@comp/db';
import { FrameworksClientPage } from './FrameworksClientPage'; // Import the Client Component
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';

export default async function Page() {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect('/auth');
  }

  const frameworks = await db.frameworkEditorFramework.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: { requirements: true },
      },
      requirements: {
        include: {
          _count: {
            select: { controlTemplates: true },
          },
        },
      },
    },
  });

  // We need to transform the data to sum up controlTemplate counts for each framework
  const frameworksWithCounts = frameworks.map((framework) => {
    const controlsCount = framework.requirements.reduce(
      (sum, req) => sum + (req._count?.controlTemplates || 0),
      0,
    );
    const { requirements, ...restOfFramework } = framework; // remove requirements to avoid sending too much data
    return {
      ...restOfFramework,
      requirementsCount: framework._count.requirements,
      controlsCount: controlsCount,
    };
  });

  return <FrameworksClientPage initialFrameworks={frameworksWithCounts} />;
}

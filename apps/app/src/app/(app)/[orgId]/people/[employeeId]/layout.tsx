import { db } from '@comp/db';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ employeeId: string; orgId: string }>;
}) {
  const { employeeId, orgId } = await params;
  const member = await db.member.findUnique({
    where: {
      id: employeeId,
    },
    select: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div className="m-auto flex max-w-[1200px] flex-col gap-4">
      {member?.user?.name && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${orgId}/people`}>{'People'}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{member.user.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {children}
    </div>
  );
}

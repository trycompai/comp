import { SecondaryMenu } from '@comp/ui/secondary-menu';

export default async function Layout({ 
  children,
  params 
}: { 
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="m-auto max-w-[1200px] py-8">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/trust`,
            label: 'Access & Grants',
          },
          {
            path: `/${orgId}/trust/portal-settings`,
            label: 'Portal Settings',
          },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}


import { SecondaryMenu } from '@comp/ui/secondary-menu';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ policyId: string; orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { orgId } = await params;

  return (
    <div className="m-auto flex max-w-[1200px] flex-col py-8">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/policies`,
            label: 'Overview',
          },
          {
            path: `/${orgId}/policies/all`,
            label: 'Policies',
            activeOverrideIdPrefix: 'pol_',
          },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}

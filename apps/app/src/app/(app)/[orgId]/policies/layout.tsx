import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { getGT } from 'gt-next/server';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ policyId: string; orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { orgId } = await params;
  const t = await getGT();

  return (
    <div className="m-auto flex max-w-[1200px] flex-col">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/policies`,
            label: t('Overview'),
          },
          {
            path: `/${orgId}/policies/all`,
            label: t('Policies'),
            activeOverrideIdPrefix: 'pol_',
          },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}

import { SecondaryMenu } from '@comp/ui/secondary-menu';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { orgId } = await params;

  return (
    <div className="m-auto flex max-w-[1200px] flex-col py-8">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/security-questionnaire`,
            label: 'Questionnaires',
          },
          {
            path: `/${orgId}/security-questionnaire/knowledge-base`,
            label: 'Knowledge Base',
          },
        ]}
      />
      <div className="pt-4">{children}</div>
    </div>
  );
}


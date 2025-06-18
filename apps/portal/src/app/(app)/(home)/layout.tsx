import { SecondaryMenu } from '@comp/ui/secondary-menu';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecondaryMenu items={[{ path: '/', label: 'Employee Portal Overview' }]} />

      <div className="mt-8">{children}</div>
    </>
  );
}

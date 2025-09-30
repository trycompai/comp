export default async function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  // Just pass through the children without any wrapper
  return <div className="h-full">{children}</div>;
}

export default function TestsDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div>{children}</div>
    </div>
  );
}

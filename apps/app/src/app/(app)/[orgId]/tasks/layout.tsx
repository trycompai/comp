export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full">
      <main className="h-full">{children}</main>
    </div>
  );
}

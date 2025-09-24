export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-auto max-w-[1200px] h-full">
      <main className="h-full py-8">{children}</main>
    </div>
  );
}

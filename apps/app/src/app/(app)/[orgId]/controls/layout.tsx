export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div>{children}</div>
    </div>
  );
}

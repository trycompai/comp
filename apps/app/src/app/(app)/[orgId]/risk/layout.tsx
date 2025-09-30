export default async function Layout({ children }: { children: React.ReactNode }) {
  return <div className="m-auto max-w-[1200px] py-8">{children}</div>;
}

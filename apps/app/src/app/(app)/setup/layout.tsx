export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  // During setup, there's no current organization yet
  return <main className="flex min-h-screen flex-col">{children}</main>;
}

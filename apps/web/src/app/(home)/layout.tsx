import { SiteHeader } from "../components/site-header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh flex flex-col">
      <SiteHeader />
      <main className="flex-1 overflow-y-auto w-full">{children}</main>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  return (
    <div className="m-auto flex max-w-[1200px] flex-col">
      <div>{children}</div>
    </div>
  );
}

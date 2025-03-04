import { SingleControl } from "./components/SingleControl";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SingleControlPage({ params }: PageProps) {
  const { id } = await params;

  return <SingleControl controlId={id} />;
}

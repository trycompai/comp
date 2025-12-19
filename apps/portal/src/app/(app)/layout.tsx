import { Header } from '@/app/components/header';
import { auth } from '@/app/lib/auth';
import { Box, Container } from '@trycompai/ui-v2';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <Box minH="dvh" bg="bg" color="fg" display="flex" flexDirection="column">
      <Header />
      <Container as="main" maxW="3xl" py="8">
        {children}
      </Container>
    </Box>
  );
}

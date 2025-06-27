import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingLayout variant="setup">{children}</OnboardingLayout>;
}

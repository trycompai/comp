import { TriggerProvider } from "@/components/trigger-provider";
import { cookies } from "next/headers";
import { OnboardingStatus } from "./components/onboarding-status";
import { LogoSpinner } from "@/components/logo-spinner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RunPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const publicAccessToken = cookieStore.get("publicAccessToken");

  return (
    <TriggerProvider accessToken={publicAccessToken?.value ?? ""}>
      <div className="bg-background flex min-h-screen items-center justify-center p-6 md:p-8">
        <div className="bg-card relative w-full max-w-[440px] border p-8 shadow-lg">
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col justify-center space-y-4 duration-300">
            <div className="flex flex-col justify-center gap-2">
              <LogoSpinner />
              <h2 className="text-center text-xl font-semibold tracking-tight">
                Onboarding in progress
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                This may take a few minutes.
              </p>
              <div className="flex flex-col items-center justify-center">
                <OnboardingStatus runId={id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TriggerProvider>
  );
}

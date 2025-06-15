"use client";

import { authClient } from "@/app/lib/auth-client";
import { Button } from "@comp/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const Unauthorized = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth");
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-center text-3xl font-bold">
          Oops, you don't belong here
        </h1>
        <p className="text-center">
          You are not authorized to access this page. Please sign in with a
          different account.
        </p>
        <Button onClick={handleSignOut} disabled={loading}>
          {loading ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

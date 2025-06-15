"use client";

import { authClient } from "@/utils/auth-client";
import { Button } from "@comp/ui/button";
import { DropdownMenuItem } from "@comp/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOut({ asButton = false }: { asButton?: boolean }) {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);

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

  if (asButton) {
    return (
      <Button onClick={handleSignOut}>
        {isLoading ? "Loading..." : "Sign out"}
      </Button>
    );
  }

  return (
    <DropdownMenuItem onClick={handleSignOut}>
      {isLoading ? "Loading..." : "Sign out"}
    </DropdownMenuItem>
  );
}

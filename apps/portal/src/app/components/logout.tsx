"use client";

import { useI18n } from "@/app/locales/client";
import { DropdownMenuItem } from "@bubba/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function Logout() {
  const t = useI18n();
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login"); // redirect to login page
        },
      },
    });
    setLoading(false);
  };

  return (
    <DropdownMenuItem onClick={handleLogout}>
      {isLoading ? "Loading..." : t("user_menu.sign_out")}
    </DropdownMenuItem>
  );
}

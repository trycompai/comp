"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { DropdownMenuItem } from "@bubba/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOut({ asButton = false }: { asButton?: boolean }) {
	const t = useI18n();
	const router = useRouter();
	const [isLoading, setLoading] = useState(false);

	const handleSignOut = async () => {
		setLoading(true);
		await signOut({ redirect: false });
		router.push("/auth");
	};

	if (asButton) {
		return (
			<Button onClick={handleSignOut}>
				{isLoading ? "Loading..." : t("user_menu.sign_out")}
			</Button>
		);
	}

	return (
		<DropdownMenuItem onClick={handleSignOut}>
			{isLoading ? "Loading..." : t("user_menu.sign_out")}
		</DropdownMenuItem>
	);
}

"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { useQueryState } from "nuqs";

export function HotKeys() {
	const router = useRouter();
	const [, setAssistantOpen] = useQueryState("assistant", {
		history: "push",
		parse: (value) => value === "true",
		serialize: (value) => value.toString(),
	});

	const handleSignOut = async () => {
		await signOut();
		router.refresh();
	};

	useHotkeys("ctrl+m", (evt) => {
		evt.preventDefault();
		router.push("/settings/members");
	});

	useHotkeys("meta+m", (evt) => {
		evt.preventDefault();
		router.push("/settings/members");
	});

	useHotkeys("ctrl+e", (evt) => {
		evt.preventDefault();
		router.push("/account/teams");
	});

	useHotkeys("ctrl+a", (evt) => {
		evt.preventDefault();
		router.push("/apps");
	});

	useHotkeys("ctrl+meta+p", (evt) => {
		evt.preventDefault();
		router.push("/account");
	});

	useHotkeys("shift+meta+p", (evt) => {
		evt.preventDefault();
		router.push("/account");
	});

	useHotkeys("ctrl+meta+q", (evt) => {
		evt.preventDefault();
		handleSignOut();
	});

	useHotkeys("shift+meta+q", (evt) => {
		evt.preventDefault();
		handleSignOut();
	});

	useHotkeys("meta+k", (evt) => {
		evt.preventDefault();
		setAssistantOpen(true);
	});

	return null;
}

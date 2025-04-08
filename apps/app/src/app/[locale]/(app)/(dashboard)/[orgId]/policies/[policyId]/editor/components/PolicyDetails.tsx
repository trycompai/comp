"use client";

import { PolicyEditor } from "@/components/editor/policy-editor";
import type { JSONContent } from "@tiptap/react";
import "@comp/ui/editor.css";
import { updatePolicy } from "../actions/update-policy";
interface PolicyDetailsProps {
	policyId: string;
	policyContent: JSONContent | JSONContent[];
}

export function PolicyPageEditor({
	policyId,
	policyContent,
}: PolicyDetailsProps) {
	const formattedContent = Array.isArray(policyContent)
		? policyContent
		: typeof policyContent === "object" && policyContent !== null
			? [policyContent as JSONContent]
			: [];

	const handleSavePolicy = async (
		policyContent: JSONContent[],
	): Promise<void> => {
		if (!policyId) return;

		try {
			await updatePolicy({ policyId, content: policyContent });
		} catch (error) {
			console.error("Error saving policy:", error);
			throw error;
		}
	};

	return (
		<div className="flex flex-col h-full border p-2">
			<PolicyEditor content={formattedContent} onSave={handleSavePolicy} />
		</div>
	);
}

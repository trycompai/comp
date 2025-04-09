"use client";

import { ChecklistProps } from "../types/ChecklistProps.types";
import { ChecklistItem } from "./ChecklistItem";

export function Checklist({ items }: ChecklistProps) {
	return (
		<div className="flex flex-col gap-4">
			{items.map((item) => (
				<div key={item.title}>
					<ChecklistItem {...item} />
				</div>
			))}
		</div>
	);
}

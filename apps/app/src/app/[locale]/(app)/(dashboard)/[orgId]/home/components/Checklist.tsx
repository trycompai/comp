"use client";

import { ChecklistProps } from "../types/ChecklistProps.types";
import { ChecklistItem } from "./ChecklistItem";

export function Checklist({ items }: ChecklistProps) {
	return (
		<>
			{items.map((item, idx) => (
				<div key={item.title} className="mb-12">
					<h2 className="text-2xl font-semibold mb-2">
						{idx + 1}. {item.title}
					</h2>
					{item.description && (
						<p className="text-muted-foreground mb-6">{item.description}</p>
					)}

					{item.href && (
						<div key={item.title} className="mb-8">
							<ChecklistItem
								title={item.title}
								description={item.description}
								href={item.href}
								dbColumn={item.dbColumn}
								completed={item.completed}
							/>
						</div>
					)}
				</div>
			))}
		</>
	);
}

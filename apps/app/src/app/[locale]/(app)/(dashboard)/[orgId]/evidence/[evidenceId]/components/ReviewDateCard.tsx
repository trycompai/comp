"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@comp/ui/card";
import { calculateNextReview } from "@/lib/utils/calculate-next-review";
import { format } from "date-fns";
import type { Frequency } from "@comp/db/types";

export function ReviewDateCard({
	lastPublishedAt,
	frequency,
}: {
	lastPublishedAt: Date | null;
	frequency: Frequency | null;
}) {
	const reviewInfo = calculateNextReview(lastPublishedAt, frequency);

	if (!reviewInfo) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Next Review Date</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-red-500 font-bold">ASAP</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Next Review Date</CardTitle>
			</CardHeader>
			<CardContent>
				<div className={reviewInfo.isUrgent ? "text-red-500" : ""}>
					{reviewInfo.daysUntil} days (
					{format(reviewInfo.nextReviewDate, "MM/dd/yyyy")})
				</div>
			</CardContent>
		</Card>
	);
}

import { format } from "date-fns";

export const EvidenceNextReviewSection = ({
	reviewInfo,
}: {
	reviewInfo: {
		daysUntil: number;
		nextReviewDate: Date;
		isUrgent: boolean;
	} | null;
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2 mb-1.5">
				<span className="font-medium">Next Review</span>
			</div>
			{!reviewInfo ? (
				<p className="text-red-500 font-medium text-sm">ASAP</p>
			) : (
				<div
					className={`text-sm font-medium ${reviewInfo.isUrgent ? "text-red-500" : ""}`}
				>
					{reviewInfo.daysUntil} days (
					{format(reviewInfo.nextReviewDate, "MM/dd/yyyy")})
				</div>
			)}
		</div>
	);
};

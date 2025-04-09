"use client";

import { useEffect, useState } from "react";
import { Progress } from "@comp/ui/progress";
import { CheckCircle } from "lucide-react";

interface OnboardingProgressProps {
	totalSteps: number;
	completedSteps: number;
}

export function OnboardingProgress({
	totalSteps,
	completedSteps,
}: OnboardingProgressProps) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const percentage = (completedSteps / totalSteps) * 100;

		// Animate progress bar
		const timer = setTimeout(() => setProgress(percentage), 100);
		return () => clearTimeout(timer);
	}, [completedSteps, totalSteps]);

	return (
		<div className="mb-8 space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">Your onboarding progress</h2>
				<div className="flex items-center gap-2 text-sm font-medium">
					<span className="text-primary">{completedSteps}</span>
					<span className="text-muted-foreground">of</span>
					<span>{totalSteps}</span>
					<span className="text-muted-foreground">completed</span>
				</div>
			</div>

			<Progress value={progress} className="h-2" />

			{completedSteps === totalSteps && (
				<div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 py-2 text-primary animate-in fade-in duration-300">
					<CheckCircle className="h-5 w-5" />
					<span className="font-medium">All steps completed!</span>
				</div>
			)}
		</div>
	);
}

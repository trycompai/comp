import { cn } from "@comp/ui/cn";
import { Button } from "@comp/ui/button";

interface WizardQuestionProps {
	step: number;
	totalSteps: number;
	question: React.ReactNode;
	onNext: () => void;
	onBack?: () => void;
	nextDisabled?: boolean;
	showBack?: boolean;
}

export function WizardQuestion({
	step,
	totalSteps,
	question,
	onNext,
	onBack,
	nextDisabled,
	showBack = true,
}: WizardQuestionProps) {
	return (
		<div>
			<div className="mb-8">{question}</div>
			<div className="flex items-center justify-between w-full gap-4 mt-4">
				<div className="flex-1">
					{showBack && (
						<Button
							variant="outline"
							onClick={onBack}
							type="button"
						>
							Back
						</Button>
					)}
				</div>
				<div className="flex items-center justify-center">
					<span className="text-muted-foreground text-xs select-none">
						Step {step + 1} / {totalSteps}
					</span>
				</div>
				<div className="flex-1 flex justify-end">
					<Button
						onClick={onNext}
						disabled={!!nextDisabled}
						type="button"
					>
						{step === totalSteps - 1 ? "Finish" : "Next"}
					</Button>
				</div>
			</div>
		</div>
	);
}

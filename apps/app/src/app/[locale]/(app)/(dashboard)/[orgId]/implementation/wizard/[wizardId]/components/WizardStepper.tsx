import { cn } from "@comp/ui/cn";

interface WizardStepperProps {
	steps: string[];
	currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
	return (
		<div>
			<div>{steps[currentStep]}</div>
		</div >
	);
}

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@comp/ui/input";
import { Textarea } from "@comp/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@comp/ui/select";
import { SelectPills } from "@comp/ui/select-pills";
import type { Step, CompanyDetails } from "../lib/types";

// It's often better to move shared types to a central location (e.g., ../lib/types.ts)
// For now, defining it here to match OnboardingForm.tsx structure.
export type OnboardingFormFields = Partial<CompanyDetails> & {
  [K in keyof CompanyDetails as `${K}Other`]?: string;
};

interface OnboardingStepInputProps {
  currentStep: Step;
  form: UseFormReturn<OnboardingFormFields>; // Or a more generic form type if preferred
  savedAnswers: Partial<CompanyDetails>;
}

export function OnboardingStepInput({
  currentStep,
  form,
  savedAnswers,
}: OnboardingStepInputProps) {
  if (currentStep.key === "describe") {
    return (
      <Textarea
        {...form.register(currentStep.key)}
        placeholder={`${savedAnswers.legalName || ""} is a company that...`}
        rows={2}
        maxLength={300}
        className="resize-none"
      />
    );
  }

  if (currentStep.options) {
    if (currentStep.key === "industry" || currentStep.key === "teamSize") {
      return (
        <Select
          onValueChange={(value) => form.setValue(currentStep.key, value)}
          defaultValue={form.watch(currentStep.key)}
        >
          <SelectTrigger>
            <SelectValue placeholder={currentStep.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {currentStep.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const options = currentStep.options.map((option) => ({
      name: option,
      value: option,
    }));
    const selected = (form.watch(currentStep.key) || "")
      .split(",")
      .filter(Boolean);

    return (
      <SelectPills
        data={options}
        value={selected}
        onValueChange={(values: string[]) => {
          form.setValue(currentStep.key, values.join(","));
        }}
        placeholder={`Type anything and press enter to add it, ${currentStep.placeholder}`}
      />
    );
  }

  return (
    <Input
      {...form.register(currentStep.key)}
      placeholder={currentStep.placeholder}
      autoFocus
    />
  );
}

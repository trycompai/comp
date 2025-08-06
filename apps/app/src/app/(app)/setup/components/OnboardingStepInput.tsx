import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { SelectPills } from '@comp/ui/select-pills';
import { Textarea } from '@comp/ui/textarea';
import { useGT } from 'gt-next';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { CompanyDetails, Step } from '../lib/types';
import { FrameworkSelection } from './FrameworkSelection';
import { WebsiteInput } from './WebsiteInput';

// Type for form fields used in this component.
// For now, defining it here to match OrganizationSetupForm.tsx structure.
export type OnboardingFormFields = Partial<CompanyDetails> & {
  [K in keyof CompanyDetails as `${K}Other`]?: string;
};

interface OnboardingStepInputProps {
  currentStep: Step;
  form: UseFormReturn<OnboardingFormFields>; // Or a more generic form type if preferred
  savedAnswers: Partial<CompanyDetails>;
  onLoadingChange?: (loading: boolean) => void;
}

export function OnboardingStepInput({
  currentStep,
  form,
  savedAnswers,
  onLoadingChange,
}: OnboardingStepInputProps) {
  const t = useGT();
  if (currentStep.key === 'frameworkIds') {
    return (
      <div data-testid={`onboarding-input-${currentStep.key}`}>
        <FrameworkSelection
          value={form.getValues(currentStep.key) || []}
          onChange={(value) => form.setValue(currentStep.key, value)}
          onLoadingChange={onLoadingChange}
        />
      </div>
    );
  }

  if (currentStep.key === 'website') {
    return (
      <Controller
        name={currentStep.key}
        control={form.control}
        render={({ field }) => (
          <WebsiteInput
            {...field}
            placeholder={t("example.com")}
            autoFocus
            data-testid={`onboarding-input-${currentStep.key}`}
          />
        )}
      />
    );
  }

  if (currentStep.key === 'describe') {
    return (
      <Textarea
        {...form.register(currentStep.key)}
        placeholder={t('{organizationName} is a company that...', { organizationName: savedAnswers.organizationName || '' })}
        rows={2}
        maxLength={300}
        className="h-24 resize-none"
        data-testid={`onboarding-input-${currentStep.key}`}
      />
    );
  }

  if (currentStep.options) {
    if (
      currentStep.key === 'industry' ||
      currentStep.key === 'teamSize' ||
      currentStep.key === 'workLocation'
    ) {
      return (
        <Select
          onValueChange={(value) => form.setValue(currentStep.key, value)}
          defaultValue={form.watch(currentStep.key)}
        >
          <SelectTrigger data-testid={`onboarding-input-${currentStep.key}`}>
            <SelectValue placeholder={currentStep.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {currentStep.options.map((option) => (
              <SelectItem
                key={option}
                value={option}
                data-testid={`onboarding-option-${option.toLowerCase().replace(/\s+/g, '-')}`}
              >
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
    const selected = (form.watch(currentStep.key) || '').split(',').filter(Boolean);

    return (
      <div data-testid={`onboarding-input-${currentStep.key}`}>
        <SelectPills
          data={options}
          value={selected}
          onValueChange={(values: string[]) => {
            form.setValue(currentStep.key, values.join(','));
          }}
          placeholder={t('Search or add custom (press Enter) • {placeholder}', { placeholder: currentStep.placeholder })}
          data-testid={`onboarding-input-${currentStep.key}-search`}
        />
      </div>
    );
  }

  return (
    <Input
      {...form.register(currentStep.key)}
      placeholder={currentStep.placeholder}
      autoFocus
      data-testid={`onboarding-input-${currentStep.key}`}
    />
  );
}

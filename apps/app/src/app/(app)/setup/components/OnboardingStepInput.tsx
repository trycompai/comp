import { AnimatedWrapper } from '@/components/animated-wrapper';
import { SelectablePill } from '@/components/selectable-pill';
import { FormLabel } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { CompanyDetails, Step } from '../lib/types';
import { FrameworkSelection } from './FrameworkSelection';
import { WebsiteInput } from './WebsiteInput';

export type OnboardingFormFields = Partial<CompanyDetails> & {
  [K in keyof CompanyDetails as `${K}Other`]?: string;
};

interface OnboardingStepInputProps {
  currentStep: Step;
  form: UseFormReturn<OnboardingFormFields>;
  savedAnswers: Partial<CompanyDetails>;
  onLoadingChange?: (loading: boolean) => void;
}

export function OnboardingStepInput({
  currentStep,
  form,
  savedAnswers,
  onLoadingChange,
}: OnboardingStepInputProps) {
  // Hooks must be called at the top level
  const [customValue, setCustomValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (currentStep.key === 'frameworkIds') {
    return (
      <AnimatedWrapper delay={100} animationKey={`framework-${currentStep.key}`}>
        <div data-testid={`onboarding-input-${currentStep.key}`}>
          <FrameworkSelection
            value={form.getValues(currentStep.key) || []}
            onChange={(value) => form.setValue(currentStep.key, value)}
            onLoadingChange={onLoadingChange}
          />
        </div>
      </AnimatedWrapper>
    );
  }

  if (currentStep.key === 'shipping') {
    return (
      <div className="space-y-4" data-testid={`onboarding-input-${currentStep.key}`}>
        <AnimatedWrapper delay={100}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <FormLabel>Full Name</FormLabel>
              <Input
                {...form.register('shipping.fullName')}
                placeholder="John Doe"
                autoFocus
                data-testid={`onboarding-input-${currentStep.key}-fullName`}
              />
              <p className="text-destructive text-[0.8rem] font-medium">
                {form.formState.errors.shipping?.fullName?.message}
              </p>
            </div>
            <div className="flex-1">
              <FormLabel>Phone</FormLabel>
              <Input
                {...form.register('shipping.phone')}
                placeholder="+1 (555) 123-4567"
                autoFocus
                data-testid={`onboarding-input-${currentStep.key}-phone`}
              />
              <p className="text-destructive text-[0.8rem] font-medium">
                {form.formState.errors.shipping?.phone?.message}
              </p>
            </div>
          </div>
        </AnimatedWrapper>
        <AnimatedWrapper delay={200}>
          <div>
            <FormLabel>Address</FormLabel>
            <Textarea
              {...form.register('shipping.address')}
              placeholder="123 Main St, Apt 4B, Springfield, IL, USA"
              rows={2}
              maxLength={300}
              data-testid={`onboarding-input-${currentStep.key}-address`}
            />
            <p className="text-destructive text-[0.8rem] font-medium">
              {form.formState.errors.shipping?.address?.message}
            </p>
          </div>
        </AnimatedWrapper>
        <AnimatedWrapper delay={300}>
          <p className="text-xs text-center sm:text-left text-muted-foreground">
            * We won't use your shipping details for any marketing.
          </p>
        </AnimatedWrapper>
      </div>
    );
  }

  if (currentStep.key === 'website') {
    return (
      <AnimatedWrapper delay={100} animationKey={`website-${currentStep.key}`}>
        <Controller
          name={currentStep.key}
          control={form.control}
          render={({ field }) => (
            <WebsiteInput
              {...field}
              placeholder="example.com"
              autoFocus
              data-testid={`onboarding-input-${currentStep.key}`}
            />
          )}
        />
      </AnimatedWrapper>
    );
  }

  if (currentStep.key === 'describe') {
    return (
      <AnimatedWrapper delay={100} animationKey={`describe-${currentStep.key}`}>
        <Textarea
          {...form.register(currentStep.key)}
          placeholder={`${savedAnswers.organizationName || ''} is a company that...`}
          rows={2}
          maxLength={300}
          className="h-24 resize-none"
          data-testid={`onboarding-input-${currentStep.key}`}
        />
      </AnimatedWrapper>
    );
  }

  if (currentStep.options) {
    // Single-select fields
    if (
      currentStep.key === 'industry' ||
      currentStep.key === 'teamSize' ||
      currentStep.key === 'workLocation'
    ) {
      const selectedValue = form.watch(currentStep.key);

      return (
        <AnimatedWrapper delay={100} animationKey={`select-${currentStep.key}`}>
          <div className="flex flex-wrap gap-2" data-testid={`onboarding-input-${currentStep.key}`}>
            {currentStep.options.map((option) => (
              <SelectablePill
                key={option}
                label={option}
                isSelected={selectedValue === option}
                onSelectionChange={(selected) => {
                  if (selected) {
                    form.setValue(currentStep.key, option);
                  }
                }}
              />
            ))}
          </div>
        </AnimatedWrapper>
      );
    }

    // Multi-select fields with custom value support
    const selectedValues = (form.watch(currentStep.key) || '').split(',').filter(Boolean);

    const handlePillToggle = (option: string) => {
      const isSelected = selectedValues.includes(option);
      let newValues;

      if (isSelected) {
        newValues = selectedValues.filter((v) => v !== option);
      } else {
        newValues = [...selectedValues, option];
      }

      form.setValue(currentStep.key, newValues.join(','));
    };

    const handleAddCustom = () => {
      if (customValue.trim() && !selectedValues.includes(customValue.trim())) {
        const newValues = [...selectedValues, customValue.trim()];
        form.setValue(currentStep.key, newValues.join(','));
        setCustomValue('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustom();
      } else if (e.key === 'Backspace' && customValue === '' && selectedValues.length > 0) {
        e.preventDefault();
        const newValues = selectedValues.slice(0, -1);
        form.setValue(currentStep.key, newValues.join(','));
      }
    };

    const predefinedOptions = currentStep.options;

    return (
      <AnimatedWrapper delay={100} animationKey={`pills-${currentStep.key}`}>
        <div className="space-y-4" data-testid={`onboarding-input-${currentStep.key}`}>
          {/* Tag input container */}
          <div
            ref={containerRef}
            onClick={() => inputRef.current?.focus()}
            className="flex flex-wrap items-center gap-2 p-3 border border-input rounded-md min-h-[3.25rem] bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text transition-all duration-200 ease-in-out"
          >
            {selectedValues.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium"
              >
                {value}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePillToggle(value);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${value}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedValues.length === 0 ? 'Search or add custom (press Enter)' : ''}
              className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Suggested options */}
          {predefinedOptions.filter((option) => !selectedValues.includes(option)).length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {predefinedOptions
                  .filter((option) => !selectedValues.includes(option))
                  .map((option) => (
                    <SelectablePill
                      key={option}
                      label={option}
                      isSelected={false}
                      onSelectionChange={() => handlePillToggle(option)}
                      showIcon={true}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </AnimatedWrapper>
    );
  }

  return (
    <AnimatedWrapper delay={100} animationKey={`input-${currentStep.key}`}>
      <Input
        {...form.register(currentStep.key)}
        placeholder={currentStep.placeholder}
        autoFocus
        data-testid={`onboarding-input-${currentStep.key}`}
      />
    </AnimatedWrapper>
  );
}

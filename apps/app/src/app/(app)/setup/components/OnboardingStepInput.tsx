import { AnimatedWrapper } from '@/components/animated-wrapper';
import { SelectablePill } from '@/components/selectable-pill';
import { Button } from '@comp/ui/button';
import { FormLabel } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller, useFieldArray } from 'react-hook-form';
import type { CompanyDetails, CSuiteEntry, Step } from '../lib/types';
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
    const { errors, isSubmitted } = form.formState;

    return (
      <div className="space-y-4" data-testid={`onboarding-input-${currentStep.key}`}>
        <AnimatedWrapper delay={100}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label>Full Name</Label>
              <Input
                {...form.register('shipping.fullName')}
                placeholder="John Doe"
                autoFocus
                data-testid={`onboarding-input-${currentStep.key}-fullName`}
              />
              {isSubmitted && errors.shipping?.fullName?.message && (
                <p className="text-destructive text-[0.8rem] font-medium">
                  {errors.shipping.fullName.message}
                </p>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Phone</Label>
              <Input
                {...form.register('shipping.phone')}
                placeholder="+1 (555) 123-4567"
                data-testid={`onboarding-input-${currentStep.key}-phone`}
              />
              {isSubmitted && errors.shipping?.phone?.message && (
                <p className="text-destructive text-[0.8rem] font-medium">
                  {errors.shipping.phone.message}
                </p>
              )}
            </div>
          </div>
        </AnimatedWrapper>
        <AnimatedWrapper delay={200}>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea
              {...form.register('shipping.address')}
              placeholder="123 Main St, Apt 4B, Springfield, IL, USA"
              rows={2}
              maxLength={300}
              data-testid={`onboarding-input-${currentStep.key}-address`}
            />
            {isSubmitted && errors.shipping?.address?.message && (
              <p className="text-destructive text-[0.8rem] font-medium">
                {errors.shipping.address.message}
              </p>
            )}
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

  if (currentStep.key === 'teamSize') {
    return (
      <AnimatedWrapper delay={100} animationKey={`teamSize-${currentStep.key}`}>
        <div className="space-y-2" data-testid={`onboarding-input-${currentStep.key}`}>
          <NumberInput
            value={form.watch(currentStep.key) || ''}
            onChange={(val) => form.setValue(currentStep.key, val)}
            placeholder={currentStep.placeholder}
          />
          {currentStep.description && (
            <p className="text-xs text-muted-foreground">{currentStep.description}</p>
          )}
        </div>
      </AnimatedWrapper>
    );
  }

  if (currentStep.key === 'cSuite') {
    return <CSuiteInput form={form} description={currentStep.description} />;
  }

  if (currentStep.key === 'reportSignatory') {
    const { errors, isSubmitted } = form.formState;

    return (
      <div className="space-y-4" data-testid={`onboarding-input-${currentStep.key}`}>
        <AnimatedWrapper delay={100}>
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                {...form.register('reportSignatory.fullName')}
                placeholder="John Doe"
                autoFocus
              />
              {isSubmitted && errors.reportSignatory?.fullName?.message && (
                <p className="text-destructive text-[0.8rem] font-medium">
                  {errors.reportSignatory.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input {...form.register('reportSignatory.jobTitle')} placeholder="CEO" />
              {isSubmitted && errors.reportSignatory?.jobTitle?.message && (
                <p className="text-destructive text-[0.8rem] font-medium">
                  {errors.reportSignatory.jobTitle.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                {...form.register('reportSignatory.email')}
                type="email"
                placeholder="john@company.com"
              />
              {isSubmitted && errors.reportSignatory?.email?.message && (
                <p className="text-destructive text-[0.8rem] font-medium">
                  {errors.reportSignatory.email.message}
                </p>
              )}
            </div>
          </div>
        </AnimatedWrapper>
        {currentStep.description && (
          <AnimatedWrapper delay={200}>
            <p className="text-xs text-muted-foreground">{currentStep.description}</p>
          </AnimatedWrapper>
        )}
      </div>
    );
  }

  if (currentStep.options) {
    // Single-select fields
    if (currentStep.key === 'industry' || currentStep.key === 'workLocation') {
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
    // At this point we know the field is a comma-separated string
    const rawValue = form.watch(currentStep.key) as string | undefined;
    const selectedValues = (rawValue || '').split(',').filter(Boolean);

    const handlePillToggle = (option: string) => {
      const isSelected = selectedValues.includes(option);
      let newValues: string[];

      if (isSelected) {
        newValues = selectedValues.filter((v: string) => v !== option);
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

// C-Suite input component with dynamic list
function CSuiteInput({
  form,
  description,
}: {
  form: UseFormReturn<OnboardingFormFields>;
  description?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'cSuite',
  });

  // Initialize with one empty entry if none exist
  if (fields.length === 0) {
    append({ name: '', title: '' });
  }

  const commonTitles = ['CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CISO', 'CPO', 'CRO'];

  return (
    <div className="space-y-4" data-testid="onboarding-input-cSuite">
      <AnimatedWrapper delay={100}>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    {...form.register(`cSuite.${index}.name`)}
                    placeholder="Full name"
                    autoFocus={index === 0}
                  />
                  <Input
                    {...form.register(`cSuite.${index}.title`)}
                    placeholder="Title (e.g., CEO)"
                    list={`titles-${index}`}
                  />
                  <datalist id={`titles-${index}`}>
                    {commonTitles.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </div>
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </AnimatedWrapper>

      <AnimatedWrapper delay={200}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: '', title: '' })}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Executive
        </Button>
      </AnimatedWrapper>

      {description && (
        <AnimatedWrapper delay={300}>
          <p className="text-xs text-muted-foreground">{description}</p>
        </AnimatedWrapper>
      )}
    </div>
  );
}

// Custom number input with styled increment/decrement buttons
function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const increment = () => {
    const num = Number.parseInt(value, 10) || 0;
    onChange(String(num + 1));
  };

  const decrement = () => {
    const num = Number.parseInt(value, 10) || 0;
    if (num > 1) {
      onChange(String(num - 1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onChange(val);
  };

  return (
    <div className="relative max-w-[200px]">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-sm border py-1 pl-3 pr-10 text-sm transition-colors focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:outline-hidden"
      />
      <div className="absolute right-0 top-0 flex h-full flex-col border-l border-input">
        <button
          type="button"
          onClick={increment}
          className="flex h-1/2 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground rounded-tr-sm"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={decrement}
          className="flex h-1/2 w-7 items-center justify-center border-t border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground rounded-br-sm"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

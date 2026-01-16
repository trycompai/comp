import { AnimatedWrapper } from '@/components/animated-wrapper';
import { SelectablePill } from '@/components/selectable-pill';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import type { GlobalVendors } from '@db';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { AlertCircle, ChevronDown, ChevronUp, HelpCircle, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller, useFieldArray } from 'react-hook-form';
import { searchGlobalVendorsAction } from '../../[orgId]/vendors/actions/search-global-vendors-action';
import type { CompanyDetails, CSuiteEntry, CustomVendor, Step } from '../lib/types';
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
  onTouchedInvalidUrlChange?: (hasTouchedInvalidUrl: boolean) => void;
}

export function OnboardingStepInput({
  currentStep,
  form,
  savedAnswers,
  onLoadingChange,
  onTouchedInvalidUrlChange,
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

  // Special handling for software step with custom vendor URL support
  if (currentStep.key === 'software' && currentStep.options) {
    return (
      <SoftwareVendorInput
        form={form}
        currentStep={currentStep}
        customValue={customValue}
        setCustomValue={setCustomValue}
        inputRef={inputRef}
        containerRef={containerRef}
        onTouchedInvalidUrlChange={onTouchedInvalidUrlChange}
      />
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
            className="flex flex-wrap items-center gap-2 p-3 border border-input rounded-md min-h-[3.25rem] bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20 cursor-text transition-all duration-200 ease-in-out"
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

// Helper to get display name from GlobalVendor
const getVendorDisplayName = (vendor: GlobalVendors): string => {
  return vendor.company_name ?? vendor.legal_name ?? vendor.website ?? '';
};

// Helper to validate domain/URL format
const isValidDomain = (domain: string): boolean => {
  if (!domain || domain.trim() === '') return true; // Empty is valid (optional field)

  // Clean the input
  const cleaned = domain.trim().toLowerCase();

  // Domain regex: allows subdomains, requires at least one dot and valid TLD
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

  return domainRegex.test(cleaned);
};

// Software vendor input with custom vendor URL support and GlobalVendors autocomplete
function SoftwareVendorInput({
  form,
  currentStep,
  customValue,
  setCustomValue,
  inputRef,
  containerRef,
  onTouchedInvalidUrlChange,
}: {
  form: UseFormReturn<OnboardingFormFields>;
  currentStep: Step;
  customValue: string;
  setCustomValue: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTouchedInvalidUrlChange?: (hasTouchedInvalidUrl: boolean) => void;
}) {
  const predefinedOptions = currentStep.options || [];

  // Search state
  const [searchResults, setSearchResults] = useState<GlobalVendors[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // URL validation state - track which fields have been touched/blurred
  const [touchedUrls, setTouchedUrls] = useState<Set<string>>(new Set());
  // Timers for debounced validation (3 seconds)
  const validationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      validationTimersRef.current.forEach((timer) => clearTimeout(timer));
      validationTimersRef.current.clear();
    };
  }, []);

  // Get custom vendors from form
  const customVendorsForCallback = (form.watch('customVendors') as CustomVendor[] | undefined) || [];

  // Notify parent about touched invalid URLs
  useEffect(() => {
    if (onTouchedInvalidUrlChange) {
      const hasTouchedInvalid = customVendorsForCallback.some((vendor) => {
        if (!touchedUrls.has(vendor.name)) return false;
        const url = (vendor.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
        return url.length > 0 && !isValidDomain(url);
      });
      onTouchedInvalidUrlChange(hasTouchedInvalid);
    }
  }, [touchedUrls, customVendorsForCallback, onTouchedInvalidUrlChange]);

  // Get predefined vendors from software field (comma-separated)
  const rawSoftware = form.watch('software') as string | undefined;
  const selectedPredefined = (rawSoftware || '').split(',').filter(Boolean);

  // Get custom vendors from customVendors field
  const customVendors = (form.watch('customVendors') as CustomVendor[] | undefined) || [];

  // Search GlobalVendors action
  const searchVendors = useAction(searchGlobalVendorsAction, {
    onExecute: () => setIsSearching(true),
    onSuccess: (result) => {
      if (result.data?.success && result.data.data?.vendors) {
        setSearchResults(result.data.data.vendors);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    },
    onError: () => {
      setSearchResults([]);
      setIsSearching(false);
    },
  });

  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (query.trim().length >= 1) {
      searchVendors.execute({ name: query });
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, 300);

  const handlePredefinedToggle = (option: string) => {
    const isSelected = selectedPredefined.includes(option);
    let newValues: string[];

    if (isSelected) {
      newValues = selectedPredefined.filter((v) => v !== option);
    } else {
      newValues = [...selectedPredefined, option];
    }

    form.setValue('software', newValues.join(','));
  };

  const handleSelectGlobalVendor = (vendor: GlobalVendors) => {
    const name = getVendorDisplayName(vendor);

    // Check if already selected
    const alreadyInPredefined = selectedPredefined.some(
      (v) => v.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyInPredefined) {
      setCustomValue('');
      setShowSuggestions(false);
      setSearchResults([]);
      return;
    }

    // Add as known vendor (to software field)
    const newValues = [...selectedPredefined, name];
    form.setValue('software', newValues.join(','));

    setCustomValue('');
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleAddCustomVendor = () => {
    const trimmedValue = customValue.trim();
    if (!trimmedValue) return;

    // Check if already exists in selected predefined or custom
    const alreadyInPredefined = selectedPredefined.some(
      (v) => v.toLowerCase() === trimmedValue.toLowerCase(),
    );
    if (alreadyInPredefined) {
      setCustomValue('');
      setShowSuggestions(false);
      return;
    }
    if (customVendors.some((v) => v.name.toLowerCase() === trimmedValue.toLowerCase())) {
      setCustomValue('');
      setShowSuggestions(false);
      return;
    }

    // Check if the typed value matches a predefined option (case-insensitive)
    const matchedPredefined = predefinedOptions.find(
      (option) => option.toLowerCase() === trimmedValue.toLowerCase(),
    );

    // Check if there's a matching GlobalVendor in search results
    const matchedGlobal = searchResults.find(
      (v) => getVendorDisplayName(v).toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (matchedPredefined) {
      // Add as predefined vendor (use the correct casing from predefinedOptions)
      const newValues = [...selectedPredefined, matchedPredefined];
      form.setValue('software', newValues.join(','));
    } else if (matchedGlobal) {
      // Add as known vendor from GlobalVendors
      const newValues = [...selectedPredefined, getVendorDisplayName(matchedGlobal)];
      form.setValue('software', newValues.join(','));
    } else {
      // Add to custom vendors
      const newCustomVendors: CustomVendor[] = [...customVendors, { name: trimmedValue }];
      form.setValue('customVendors', newCustomVendors);
    }

    setCustomValue('');
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleRemoveCustomVendor = (vendorName: string) => {
    const newCustomVendors = customVendors.filter((v) => v.name !== vendorName);
    form.setValue('customVendors', newCustomVendors);
  };

  const handleCustomVendorWebsiteChange = (vendorName: string, website: string) => {
    const newCustomVendors = customVendors.map((v) =>
      v.name === vendorName ? { ...v, website } : v,
    );
    form.setValue('customVendors', newCustomVendors);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomValue(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomVendor();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && customValue === '') {
      e.preventDefault();
      // Remove last custom vendor first, then predefined
      if (customVendors.length > 0) {
        const newCustomVendors = customVendors.slice(0, -1);
        form.setValue('customVendors', newCustomVendors);
      } else if (selectedPredefined.length > 0) {
        const newValues = selectedPredefined.slice(0, -1);
        form.setValue('software', newValues.join(','));
      }
    }
  };

  // Filter out already selected vendors from search results
  const filteredSearchResults = searchResults.filter((vendor) => {
    const name = getVendorDisplayName(vendor).toLowerCase();
    return (
      !selectedPredefined.some((v) => v.toLowerCase() === name) &&
      !customVendors.some((v) => v.name.toLowerCase() === name)
    );
  });

  // All selected values for display in the tag input
  const allSelectedValues = [
    ...selectedPredefined.map((name) => ({ name, isCustom: false })),
    ...customVendors.map((v) => ({ name: v.name, isCustom: true })),
  ];

  return (
    <AnimatedWrapper delay={100} animationKey={`pills-${currentStep.key}`}>
      <div className="space-y-3" data-testid={`onboarding-input-${currentStep.key}`}>
        {/* Tag input container with autocomplete */}
        <div className="relative">
          <div
            ref={containerRef}
            onClick={() => inputRef.current?.focus()}
            className="flex flex-wrap items-center gap-2 p-3 border border-input rounded-md min-h-[3.25rem] bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20 cursor-text transition-all duration-200 ease-in-out"
          >
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {allSelectedValues.map(({ name, isCustom }) => (
              <span
                key={name}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  isCustom
                    ? 'bg-muted text-foreground border border-border'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCustom) {
                      handleRemoveCustomVendor(name);
                    } else {
                      handlePredefinedToggle(name);
                    }
                  }}
                  className={`rounded-full p-0.5 transition-colors ${
                    isCustom ? 'hover:bg-foreground/10' : 'hover:bg-primary/20'
                  }`}
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={
                allSelectedValues.length === 0 ? 'Search or add custom (press Enter)' : ''
              }
              className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && customValue.trim().length >= 1 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-background shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="max-h-[200px] overflow-y-auto p-1">
                {/* Always show "Add as custom" option first for consistent height */}
                <div
                  className="hover:bg-accent cursor-pointer rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-100"
                  onMouseDown={() => handleAddCustomVendor()}
                >
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Searching for "{customValue.trim()}"...
                    </span>
                  ) : (
                    <>Add "{customValue.trim()}" as custom vendor</>
                  )}
                </div>

                {/* Animated results section using CSS Grid for smooth height transition */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                  style={{
                    gridTemplateRows: !isSearching && filteredSearchResults.length > 0 ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="my-1 border-t border-border" />
                    <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                      Suggestions
                    </p>
                    {filteredSearchResults.map((vendor) => (
                      <div
                        key={vendor.website}
                        className="hover:bg-accent cursor-pointer rounded-sm px-2 py-1.5 text-sm transition-colors duration-100"
                        onMouseDown={() => handleSelectGlobalVendor(vendor)}
                      >
                        {getVendorDisplayName(vendor)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom vendor URL inputs */}
        {customVendors.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Vendor websites</Label>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {customVendors.map((vendor) => {
                // Strip protocol for display, we'll add it back on save
                const displayValue = (vendor.website || '')
                  .replace(/^https?:\/\//, '')
                  .replace(/^www\./, '');

                const isTouched = touchedUrls.has(vendor.name);
                const isValid = isValidDomain(displayValue);
                const showError = isTouched && !isValid && displayValue.length > 0;

                return (
                  <div key={vendor.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-foreground">
                        {vendor.name}
                      </span>
                    </div>
                    <div
                      className={`flex items-center rounded-md border bg-background overflow-hidden transition-colors duration-150 ${
                        showError
                          ? 'border-red-500 focus-within:ring-1 focus-within:ring-red-500/20'
                          : 'border-input focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20'
                      }`}
                    >
                      <span className="px-3 py-2 text-xs font-mono text-muted-foreground/70 select-none border-r border-input/30 bg-muted/30 flex items-center">
                        https://
                      </span>
                      <input
                        type="text"
                        value={displayValue}
                        onChange={(e) => {
                          // Clean input: remove any protocol, www, and trim
                          let value = e.target.value
                            .replace(/^(https?:\/\/)+/gi, '') // Remove one or more https://
                            .replace(/^(www\.)+/gi, '')       // Remove one or more www.
                            .trim();
                          const fullUrl = value ? `https://${value}` : '';
                          handleCustomVendorWebsiteChange(vendor.name, fullUrl);
                          
                          // Clear touched state when user starts typing again
                          if (touchedUrls.has(vendor.name)) {
                            setTouchedUrls((prev) => {
                              const next = new Set(prev);
                              next.delete(vendor.name);
                              return next;
                            });
                          }
                          
                          // Clear existing timer for this field
                          const existingTimer = validationTimersRef.current.get(vendor.name);
                          if (existingTimer) {
                            clearTimeout(existingTimer);
                            validationTimersRef.current.delete(vendor.name);
                          }
                          
                          // Set new timer for 3 seconds - validate if value is invalid
                          if (value.length > 0) {
                            const timer = setTimeout(() => {
                              // Get current value from form state
                              const currentVendors = (form.watch('customVendors') as CustomVendor[] | undefined) || [];
                              const currentVendor = currentVendors.find((v) => v.name === vendor.name);
                              const currentValue = (currentVendor?.website || '')
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '');
                              const isValid = isValidDomain(currentValue);
                              // Only mark as touched if invalid (to show error)
                              if (!isValid && currentValue.length > 0) {
                                setTouchedUrls((prev) => new Set(prev).add(vendor.name));
                              }
                              validationTimersRef.current.delete(vendor.name);
                            }, 3000);
                            validationTimersRef.current.set(vendor.name, timer);
                          }
                        }}
                        onBlur={() => {
                          // Clear any pending timer
                          const existingTimer = validationTimersRef.current.get(vendor.name);
                          if (existingTimer) {
                            clearTimeout(existingTimer);
                            validationTimersRef.current.delete(vendor.name);
                          }
                          
                          // Check validity immediately on blur
                          const isValid = isValidDomain(displayValue);
                          // Only mark as touched if invalid (to show error)
                          if (!isValid && displayValue.length > 0) {
                            setTouchedUrls((prev) => new Set(prev).add(vendor.name));
                          }
                        }}
                        placeholder="example.com"
                        className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      {showError ? (
                        <div className="pr-2 flex items-center">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                      ) : !displayValue ? (
                        <div className="pr-2 flex items-center">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-all duration-300 ease-in-out p-1 hover:scale-110">
                                  <HelpCircle className="h-3.5 w-3.5 transition-all duration-300 ease-in-out" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <p>Without a URL, we can't perform automatic risk assessment for this vendor.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AnimatedWrapper>
  );
}

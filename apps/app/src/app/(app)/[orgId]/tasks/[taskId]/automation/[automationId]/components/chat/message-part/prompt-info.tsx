import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface FieldInfo {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  required: boolean;
}

interface PromptInfoProps {
  input?: any; // Will be the parsed input from the tool
  output?: any;
  state: 'input-available' | 'output-available' | 'output-error' | 'input-streaming';
  errorText?: string;
  onInfoProvided?: (info: Record<string, string>) => void;
}

export const PromptInfo = memo(function PromptInfo({
  input,
  output,
  state,
  errorText,
  onInfoProvided,
}: PromptInfoProps) {
  // Parse the input safely
  const infoData = input
    ? {
        fields: input.fields || [],
        reason: input.reason || '',
      }
    : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  // If state is 'output-available', the info was already provided (historical message)
  const [isComplete, setIsComplete] = useState(state === 'output-available');

  // Initialize values from props only once on mount
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!infoData?.fields) return {};
    const initial: Record<string, string> = {};
    infoData.fields.forEach((field: FieldInfo) => {
      initial[field.name] = field.defaultValue || '';
    });
    return initial;
  });

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = infoData?.fields.filter(
      (field: FieldInfo) => field.required && !values[field.name]?.trim(),
    );

    if (missingFields?.length > 0) {
      toast.error(
        `Please fill in all required fields: ${missingFields.map((f: FieldInfo) => f.label).join(', ')}`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Send the info back to the parent
      onInfoProvided?.(values);
      setIsComplete(true);
    } catch (error) {
      console.error('Error submitting info:', error);
      toast.error('Failed to submit information');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'output-error') {
    return (
      <div className="rounded-xs border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Error prompting for information</p>
            <p className="mt-1 text-muted-foreground">{errorText}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'input-streaming') {
    return (
      <div className="rounded-xs border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-pulse">Preparing information request...</div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="rounded-xs border bg-green-50 p-4">
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Information provided successfully</p>
            <p className="mt-1">The automation can now continue with this information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xs border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xs bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm">Additional Information Required</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {infoData?.reason || 'Please provide the following information to continue.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {infoData?.fields.map((field: FieldInfo) => (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={field.name} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              value={values[field.name] || ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholder}
              disabled={isSubmitting}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        ))}

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="sm">
          {isSubmitting ? 'Submitting...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
});

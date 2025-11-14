import { AlertCircle, CheckCircle2, Key } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface PromptSecretProps {
  input?: any; // Will be the parsed input from the tool
  output?: any;
  state: 'input-available' | 'output-available' | 'output-error' | 'input-streaming';
  errorText?: string;
  orgId: string;
  onSecretAdded?: (secretName: string) => void;
}

export const PromptSecret = memo(function PromptSecret({
  input,
  output,
  state,
  errorText,
  orgId,
  onSecretAdded,
}: PromptSecretProps) {
  // Parse the input safely
  const secretData = input
    ? {
        secretName: input.secretName || '',
        description: input.description,
        category: input.category,
        exampleValue: input.exampleValue,
        reason: input.reason || '',
      }
    : null;

  // Use the secret name from AI or allow user to set one - initialize on mount only
  const [name, setName] = useState(() => secretData?.secretName || '');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState(() => secretData?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // If state is 'output-available', the secret was already added (historical message)
  const [isComplete, setIsComplete] = useState(state === 'output-available');

  // Use the provided secret name or the user-entered one
  const finalSecretName = secretData?.secretName || name;

  const handleSubmit = async () => {
    if (!finalSecretName || !value) {
      toast.error('Please provide both name and value for the secret');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: finalSecretName.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        value,
        description: description || secretData?.description || '',
        category: secretData?.category || 'automation',
        organizationId: orgId,
      };

      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create secret');
      }

      const { secret } = await response.json();

      toast.success(`Secret "${secret.name}" created successfully`);
      setIsComplete(true);
      onSecretAdded?.(secret.name);

      // Reset form
      setValue('');
    } catch (error) {
      console.error('Error creating secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create secret');
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
            <p className="font-medium">Error prompting for secret</p>
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
          <div className="animate-pulse">Preparing secret request...</div>
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
            <p className="font-medium">Secret "{finalSecretName}" added successfully</p>
            <p className="mt-1">The automation can now use this secret.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xs border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xs bg-primary/10">
          <Key className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm">Secret Required</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {secretData?.reason || 'This automation needs a secret to continue.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="secret-name" className="text-sm">
            Secret Name
          </Label>
          <Input
            id="secret-name"
            value={secretData?.secretName || name}
            onChange={(e) =>
              !secretData?.secretName &&
              setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
            }
            placeholder={secretData?.secretName || 'SECRET_NAME'}
            className="font-mono"
            readOnly={!!secretData?.secretName}
            disabled={isSubmitting}
          />
          {!secretData?.secretName && (
            <p className="text-xs text-muted-foreground">
              Use uppercase letters, numbers, and underscores only
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="secret-value" className="text-sm">
            Secret Value
          </Label>
          <Input
            id="secret-value"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={secretData?.exampleValue || 'Your secret value'}
            autoComplete="off"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            This value will be encrypted and stored securely
          </p>
        </div>

        {secretData?.description && (
          <div className="grid gap-2">
            <Label className="text-sm">Description</Label>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 break-words whitespace-pre-wrap max-h-48 overflow-y-auto">
              {secretData.description}
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !finalSecretName || !value}
          className="w-full"
          size="sm"
        >
          {isSubmitting ? 'Adding Secret...' : 'Add Secret'}
        </Button>
      </div>
    </div>
  );
});

'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { connectCloudAction } from '../actions/connect-cloud';

interface CloudField {
  id: string;
  label: string;
  description: string;
  placeholder?: string;
  helpText?: string;
  type?: string;
}

type TriggerInfo = {
  taskId?: string;
  publicAccessToken?: string;
};

interface CloudConnectionCardProps {
  cloudProvider: 'aws' | 'gcp' | 'azure';
  name: string;
  shortName: string;
  description: string;
  fields: CloudField[];
  guideUrl?: string;
  color?: string;
  logoUrl?: string;
  onSuccess?: (trigger?: TriggerInfo) => void;
}

export function CloudConnectionCard({
  cloudProvider,
  name,
  shortName,
  description,
  fields,
  guideUrl,
  color = 'from-primary to-primary',
  logoUrl,
  onSuccess,
}: CloudConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (!credentials[field.id]?.trim()) {
        newErrors[field.id] = 'Required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = async () => {
    if (!validateFields()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsConnecting(true);
      const result = await connectCloudAction({
        cloudProvider,
        credentials,
      });

      if (result?.data?.success) {
        toast.success(`${name} connected! Running initial scan...`);
        setCredentials({});
        onSuccess?.(result.data?.trigger);

        if (result.data?.runErrors && result.data.runErrors.length > 0) {
          toast.error(result.data.runErrors[0] || 'Initial scan reported an issue');
        }
      } else {
        toast.error(result?.data?.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="rounded-xs">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`bg-gradient-to-br ${color} flex items-center justify-center rounded-lg p-2`}
          >
            {logoUrl && (
              <img src={logoUrl} alt={`${shortName} logo`} className="h-8 w-8 object-contain" />
            )}
          </div>
          <div>
            <CardTitle>{shortName}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        {guideUrl && (
          <a
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            Setup guide
          </a>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm">
              {field.label}
              <span className="text-destructive ml-1">*</span>
            </Label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.id}
                placeholder={field.placeholder}
                value={credentials[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                disabled={isConnecting}
                className={`bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors[field.id] ? 'border-destructive' : ''
                }`}
              />
            ) : (
              <Input
                id={field.id}
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={credentials[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                disabled={isConnecting}
                className={errors[field.id] ? 'border-destructive' : ''}
              />
            )}
            {field.helpText && <p className="text-muted-foreground text-xs">{field.helpText}</p>}
          </div>
        ))}
        <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

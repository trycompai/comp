'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@trycompai/design-system';
import { Add, Close, Information } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';

interface AllowedEmailsManagerProps {
  initialEmails: string[];
  orgId: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AllowedEmailsManager({ initialEmails }: AllowedEmailsManagerProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('trust', 'update');
  const { updateAllowedEmails } = useTrustPortalSettings();
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [lastSavedEmails, setLastSavedEmails] = useState<string[]>(initialEmails);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const saveEmails = async (updatedEmails: string[]) => {
    setIsUpdating(true);
    try {
      await updateAllowedEmails(updatedEmails);
      toast.success('Allowed emails updated');
      setLastSavedEmails(updatedEmails);
    } catch {
      toast.error('Failed to update allowed emails');
      setEmails(lastSavedEmails);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddEmail = () => {
    setError(null);
    const normalized = newEmail.toLowerCase().trim();

    if (!normalized) {
      setError('Please enter an email address');
      return;
    }

    if (!emailRegex.test(normalized)) {
      setError('Invalid email format (e.g., person@example.com)');
      return;
    }

    if (emails.includes(normalized)) {
      setError('Email already in list');
      return;
    }

    const updatedEmails = [...emails, normalized];
    setEmails(updatedEmails);
    setNewEmail('');
    saveEmails(updatedEmails);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedEmails = emails.filter((email) => email !== emailToRemove);
    setEmails(updatedEmails);
    saveEmails(updatedEmails);
    setEmailToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (emailToDelete) {
      handleRemoveEmail(emailToDelete);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>NDA Bypass - Allowed Emails</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger aria-label="What does this do?">
                <Information size={16} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Individuals with these exact email addresses receive direct
                  access to the trust portal without signing an NDA when their
                  request is approved. Use this when an NDA has already been
                  signed outside Comp.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Individual email addresses that bypass NDA signing for trust portal access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="person@example.com"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isUpdating || !canUpdate}
              />
              {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Add email"
              onClick={handleAddEmail}
              disabled={isUpdating || !newEmail.trim() || !canUpdate}
            >
              <Add size={16} />
            </Button>
          </div>

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map((email) => (
                <Badge key={email} variant="secondary">
                  <span className="flex items-center gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmailToDelete(email)}
                      disabled={isUpdating || !canUpdate}
                      className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Remove ${email}`}
                    >
                      <Close size={12} />
                    </button>
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={emailToDelete !== null}
        onOpenChange={(open) => !open && setEmailToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{emailToDelete}</strong> from
              the allowed emails list? This person will need to sign an NDA when
              requesting access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

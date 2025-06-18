import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface NoAccessMessageProps {
  message?: string;
}

export function NoAccessMessage({ message }: NoAccessMessageProps) {
  return (
    <Alert variant="destructive" className="mx-auto max-w-md">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>
        {message ??
          'You do not have access to the employee portal with this account, or you are not currently assigned to an organization. Please contact your administrator if you believe this is an error.'}
      </AlertDescription>
    </Alert>
  );
}

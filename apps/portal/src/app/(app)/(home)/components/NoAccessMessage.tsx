import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { WarningAlt } from '@trycompai/design-system/icons';

interface NoAccessMessageProps {
  message?: string;
}

export function NoAccessMessage({ message }: NoAccessMessageProps) {
  return (
    <Alert variant="destructive" className="mx-auto max-w-md">
      <WarningAlt size={16} />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>
        {message ??
          'You do not have access to the employee portal with this account, or you are not currently assigned to an organization. Please contact your administrator if you believe this is an error.'}
      </AlertDescription>
    </Alert>
  );
}

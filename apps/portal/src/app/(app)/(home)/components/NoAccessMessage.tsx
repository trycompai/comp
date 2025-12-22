import { AlertTriangle } from 'lucide-react';

interface NoAccessMessageProps {
  message?: string;
}

export function NoAccessMessage({ message }: NoAccessMessageProps) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-destructive/20 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-destructive">Access Denied</p>
          <p className="text-sm text-destructive/90">
            {message ??
              'You do not have access to the employee portal with this account, or you are not currently assigned to an organization. Please contact your administrator if you believe this is an error.'}
          </p>
        </div>
      </div>
    </div>
  );
}

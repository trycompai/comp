'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import type { Member, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BackgroundCheckDetailsForm } from './BackgroundCheckDetailsForm';
import { BackgroundCheckStatusView } from './BackgroundCheckStatusView';
import { OverviewStep } from './BackgroundCheckWizardParts';
import { CustomBackgroundCheckUpload } from './CustomBackgroundCheckUpload';
import { PaymentMethodUpdateDialog } from './PaymentMethodUpdateDialog';
import {
  backgroundCheckSchema,
  clearPendingBackgroundCheckRequest,
  readPendingBackgroundCheckRequest,
  writePendingBackgroundCheckRequest,
  type BackgroundCheckFormValues,
} from './backgroundCheckForm';
import type { BackgroundCheckBillingStatus, BackgroundCheckRecord } from './backgroundCheckTypes';

interface EmployeeBackgroundCheckProps {
  employee: Member & { user: User };
  organizationId: string;
  initialBackgroundCheck: BackgroundCheckRecord | null;
  initialBillingStatus: BackgroundCheckBillingStatus;
}

export function EmployeeBackgroundCheck({
  employee,
  organizationId,
  initialBackgroundCheck,
  initialBillingStatus,
}: EmployeeBackgroundCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledSessionId = useRef<string | null>(null);
  const [wizardStep, setWizardStep] = useState<'overview' | 'details'>(() => {
    if (searchParams.get('background_check_step') === 'details') return 'details';
    return initialBillingStatus.hasPaymentMethod ? 'details' : 'overview';
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [billingSetupComplete, setBillingSetupComplete] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState<string | null>(null);
  const [requestConfirmation, setRequestConfirmation] = useState<string | null>(null);
  const { hasPermission } = usePermissions();

  const { data: backgroundCheck, mutate: mutateBackgroundCheck } =
    useSWR<BackgroundCheckRecord | null>(
      [`/v1/people/${employee.id}/background-check`, organizationId],
      async ([endpoint]) => {
        const response = await apiClient.get<BackgroundCheckRecord | null>(
          endpoint,
          organizationId,
        );
        if (response.error) throw new Error(response.error);
        return response.data ?? null;
      },
      { fallbackData: initialBackgroundCheck },
    );

  const { data: billingStatus, mutate: mutateBillingStatus } = useSWR<BackgroundCheckBillingStatus>(
    ['/v1/background-check-billing/status', organizationId],
    async ([endpoint]) => {
      const response = await apiClient.get<BackgroundCheckBillingStatus>(endpoint, organizationId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load billing status');
      }
      return response.data;
    },
    { fallbackData: initialBillingStatus },
  );

  const form = useForm<BackgroundCheckFormValues>({
    resolver: zodResolver(backgroundCheckSchema),
    defaultValues: {
      employeeName: backgroundCheck?.employeeName ?? employee.user.name ?? '',
      employeeEmail: backgroundCheck?.employeeEmail ?? '',
      requesterNotes: backgroundCheck?.requesterNotes ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      employeeName: backgroundCheck?.employeeName ?? employee.user.name ?? '',
      employeeEmail: backgroundCheck?.employeeEmail ?? '',
      requesterNotes: backgroundCheck?.requesterNotes ?? '',
    });
  }, [backgroundCheck, employee.user.name, form]);

  const canRequest = hasPermission('member', 'update');
  const canManageBilling = hasPermission('organization', 'update');
  const hasPaymentMethod = billingStatus?.hasPaymentMethod === true;
  const visibleWizardStep = hasPaymentMethod ? 'details' : wizardStep;

  const writePendingRequest = useCallback(
    (values: BackgroundCheckFormValues) => {
      writePendingBackgroundCheckRequest({
        organizationId,
        memberId: employee.id,
        values,
      });
    },
    [employee.id, organizationId],
  );

  const clearPendingRequest = useCallback(() => {
    clearPendingBackgroundCheckRequest({
      organizationId,
      memberId: employee.id,
    });
  }, [employee.id, organizationId]);

  const requestBackgroundCheck = useCallback(
    async (values: BackgroundCheckFormValues): Promise<boolean> => {
      setPaymentIssue(null);
      setIsRequesting(true);
      const response = await apiClient.post<BackgroundCheckRecord>(
        `/v1/people/${employee.id}/background-check`,
        {
          employeeName: values.employeeName,
          employeeEmail: values.employeeEmail,
          requesterNotes: values.requesterNotes?.trim() || undefined,
        },
        organizationId,
      );
      setIsRequesting(false);

      if (response.error || !response.data) {
        if (response.status === 402) {
          setPaymentIssue(
            response.error ?? 'Payment failed. Update billing details and try again.',
          );
          return false;
        }
        toast.error(response.error ?? 'Failed to request background check');
        return false;
      }

      setRequestConfirmation(
        'The saved payment method was charged and the candidate invite has been sent.',
      );
      toast.success('Background check invite sent');
      await mutateBackgroundCheck(response.data, { revalidate: false });
      clearPendingRequest();
      return true;
    },
    [clearPendingRequest, employee.id, mutateBackgroundCheck, organizationId],
  );

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const setupSucceeded = searchParams.get('background_check_billing') === 'success';
    if (!sessionId || !setupSucceeded || handledSessionId.current === sessionId) return;

    handledSessionId.current = sessionId;
    setWizardStep('details');
    void (async () => {
      const setupResponse = await apiClient.post<{ success: true }>(
        '/v1/background-check-billing/setup-success',
        { sessionId },
        organizationId,
      );
      if (setupResponse.error) {
        toast.error(setupResponse.error);
        router.replace(pathname, { scroll: false });
        return;
      }

      setBillingSetupComplete(true);
      setPaymentIssue(null);
      toast.success('Payment method saved');
      await mutateBillingStatus(
        { hasPaymentMethod: true, setupAt: new Date().toISOString() },
        { revalidate: true },
      );

      const pendingRequest = readPendingBackgroundCheckRequest({
        organizationId,
        memberId: employee.id,
      });
      if (!pendingRequest) {
        router.replace(pathname, { scroll: false });
        return;
      }

      form.reset({
        employeeName: pendingRequest.employeeName,
        employeeEmail: pendingRequest.employeeEmail,
        requesterNotes: pendingRequest.requesterNotes ?? '',
      });
      setBillingSetupComplete(true);

      router.replace(pathname, { scroll: false });
    })();
  }, [
    clearPendingRequest,
    form,
    employee.id,
    mutateBillingStatus,
    organizationId,
    pathname,
    router,
    searchParams,
  ]);

  const handleOpenBilling = async (values?: BackgroundCheckFormValues) => {
    setIsOpeningBilling(true);
    if (values) writePendingRequest(values);

    const backgroundCheckPath = `/${organizationId}/people/${employee.id}`;
    const returnUrl = `${window.location.origin}${backgroundCheckPath}`;
    const endpoint = hasPaymentMethod
      ? '/v1/background-check-billing/portal'
      : '/v1/background-check-billing/setup-session';
    const body = hasPaymentMethod
      ? { returnUrl }
      : {
          successUrl: `${returnUrl}?background_check_billing=success&background_check_step=details&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${returnUrl}?background_check_step=details`,
        };
    const response = await apiClient.post<{ url: string }>(endpoint, body, organizationId);

    if (response.data?.url) {
      window.location.href = response.data.url;
      return;
    }

    toast.error(response.error ?? 'Failed to open billing');
    setIsOpeningBilling(false);
  };

  const handleComplete = async (values: BackgroundCheckFormValues) => {
    if (!hasPaymentMethod) {
      await handleOpenBilling(values);
      return;
    }

    await requestBackgroundCheck(values);
  };

  if (backgroundCheck) {
    return (
      <BackgroundCheckStatusView
        backgroundCheck={backgroundCheck}
        confirmation={requestConfirmation}
        memberId={employee.id}
        organizationId={organizationId}
      />
    );
  }

  return (
    <>
      {visibleWizardStep === 'overview' && (
        <OverviewStep canRequest={canRequest} onGetStarted={() => setWizardStep('details')} />
      )}
      {visibleWizardStep === 'details' && (
        <BackgroundCheckDetailsForm
          canRequest={canRequest}
          form={form}
          isOpeningBilling={isOpeningBilling}
          isRequesting={isRequesting}
          billingSetupComplete={billingSetupComplete}
          hasPaymentMethod={hasPaymentMethod}
          canGoBack={!hasPaymentMethod}
          onBack={() => setWizardStep('overview')}
          onSubmit={handleComplete}
        />
      )}
      <PaymentMethodUpdateDialog
        canManageBilling={canManageBilling}
        isOpeningBilling={isOpeningBilling}
        issue={paymentIssue}
        open={paymentIssue !== null}
        onOpenChange={(open) => !open && setPaymentIssue(null)}
        onUpdatePaymentMethod={() => void handleOpenBilling(form.getValues())}
      />
      <CustomBackgroundCheckUpload
        canRequest={canRequest}
        employeeEmail={employee.user.email}
        employeeId={employee.id}
        employeeName={employee.user.name ?? employee.user.email}
        organizationId={organizationId}
        onUploaded={async (uploadedBackgroundCheck) => {
          await mutateBackgroundCheck(uploadedBackgroundCheck, { revalidate: false });
        }}
      />
    </>
  );
}

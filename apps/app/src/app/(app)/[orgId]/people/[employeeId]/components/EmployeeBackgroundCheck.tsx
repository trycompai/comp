'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import type { Member, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BackgroundCheckDetailsForm } from './BackgroundCheckDetailsForm';
import {
  type BackgroundCheckFormValues,
  backgroundCheckSchema,
  clearPendingBackgroundCheckRequest,
  readPendingBackgroundCheckRequest,
  writePendingBackgroundCheckRequest,
} from './backgroundCheckForm';
import { BackgroundCheckStatusView } from './BackgroundCheckStatusView';
import type { BackgroundCheckBillingStatus, BackgroundCheckRecord } from './backgroundCheckTypes';
import { OverviewStep } from './BackgroundCheckWizardParts';
import { CustomBackgroundCheckUpload } from './CustomBackgroundCheckUpload';
import { PaymentMethodUpdateDialog } from './PaymentMethodUpdateDialog';
import {
  getBackgroundChecksRemaining,
  useBackgroundCheckBillingStatus,
  useBackgroundCheckRecord,
} from './useEmployeeBackgroundCheckData';

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

  const { data: backgroundCheck, mutate: mutateBackgroundCheck } = useBackgroundCheckRecord({
    employeeId: employee.id,
    initialBackgroundCheck,
    organizationId,
  });
  const { data: billingStatus, mutate: mutateBillingStatus } = useBackgroundCheckBillingStatus({
    initialBillingStatus,
    organizationId,
  });

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
  const backgroundChecksRemaining = getBackgroundChecksRemaining({ billingStatus });
  const hasBackgroundCheckAllowance =
    backgroundChecksRemaining !== null && backgroundChecksRemaining > 0;
  const visibleWizardStep = hasBackgroundCheckAllowance ? 'details' : wizardStep;

  const writePendingRequest = useCallback(
    (values: BackgroundCheckFormValues) => {
      writePendingBackgroundCheckRequest({ organizationId, memberId: employee.id, values });
    },
    [employee.id, organizationId],
  );

  const clearPendingRequest = useCallback(() => {
    clearPendingBackgroundCheckRequest({ organizationId, memberId: employee.id });
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
          writePendingRequest(values);
          toast.error('Choose or upgrade a background check plan to continue.');
          router.push(`/${organizationId}/settings/billing/add-ons/background-checks`);
          return false;
        }
        toast.error('Failed to request background check');
        return false;
      }

      setRequestConfirmation(
        'An invitation has been sent to the employee. Ask them to check their inbox, including spam or junk folders.',
      );
      toast.success('Background check invite sent');
      await mutateBackgroundCheck(response.data, { revalidate: false });
      clearPendingRequest();
      return true;
    },
    [
      clearPendingRequest,
      employee.id,
      mutateBackgroundCheck,
      organizationId,
      router,
      writePendingRequest,
    ],
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
        toast.error('Failed to save payment method');
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
      router.replace(pathname, { scroll: false });
    })();
  }, [form, employee.id, mutateBillingStatus, organizationId, pathname, router, searchParams]);

  const handleOpenBilling = async (values?: BackgroundCheckFormValues) => {
    setIsOpeningBilling(true);
    if (values) writePendingRequest(values);

    const returnPath = hasPaymentMethod
      ? `/${organizationId}/people/${employee.id}`
      : `/${organizationId}/settings/billing`;
    const returnUrl = `${window.location.origin}${returnPath}`;
    const endpoint = hasPaymentMethod
      ? '/v1/background-check-billing/portal'
      : '/v1/background-check-billing/setup-session';
    const body = hasPaymentMethod
      ? { returnUrl }
      : {
          successUrl: `${returnUrl}?background_check_billing=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: returnUrl,
        };
    const response = await apiClient.post<{ url: string }>(endpoint, body, organizationId);

    if (response.data?.url) {
      window.location.href = response.data.url;
      return;
    }

    toast.error('Failed to open billing');
    setIsOpeningBilling(false);
  };

  const handleComplete = async (values: BackgroundCheckFormValues) => {
    if (!hasBackgroundCheckAllowance) {
      writePendingRequest(values);
      router.push(`/${organizationId}/settings/billing/add-ons/background-checks`);
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
        <OverviewStep
          billingHref={`/${organizationId}/settings/billing/add-ons/background-checks`}
          canManageBilling={canManageBilling}
          canRequest={canRequest}
          hasPaymentMethod={hasBackgroundCheckAllowance}
          isOpeningBilling={isOpeningBilling}
          onGetStarted={() => setWizardStep('details')}
          onOpenBilling={() =>
            router.push(`/${organizationId}/settings/billing/add-ons/background-checks`)
          }
        />
      )}
      {visibleWizardStep === 'details' && (
        <BackgroundCheckDetailsForm
          canRequest={canRequest}
          form={form}
          isOpeningBilling={isOpeningBilling}
          isRequesting={isRequesting}
          billingSetupComplete={billingSetupComplete}
          backgroundChecksRemaining={backgroundChecksRemaining}
          canGoBack={!hasBackgroundCheckAllowance}
          billingHref={`/${organizationId}/settings/billing/add-ons/background-checks`}
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

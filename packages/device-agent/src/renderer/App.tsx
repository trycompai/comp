import {
  Badge,
  Button,
  Card,
  CardContent,
  Heading,
  LogoIcon,
  Separator,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronDown, ChevronUp, Launch, Renew, Settings } from '@trycompai/design-system/icons';
import React, { useCallback, useEffect, useState } from 'react';
import type {
  CheckResult,
  DeviceCheckType,
  RemediationInfo,
  RemediationResult,
} from '../shared/types';

declare global {
  interface Window {
    compAgent: {
      getAppVersion: () => Promise<string>;
      getAuthStatus: () => Promise<{
        isAuthenticated: boolean;
        organizations: Array<{ organizationName: string }>;
      }>;
      login: () => Promise<boolean>;
      logout: () => Promise<void>;
      getCheckResults: () => Promise<CheckResult[]>;
      runChecksNow: () => Promise<void>;
      getDeviceInfo: () => Promise<{
        name: string;
        hostname: string;
        platform: string;
        osVersion: string;
      } | null>;
      getRemediationInfo: () => Promise<RemediationInfo[]>;
      remediateCheck: (checkType: DeviceCheckType) => Promise<RemediationResult>;
      onAuthStateChanged: (callback: (isAuthenticated: boolean) => void) => () => void;
      onCheckResultsUpdated: (
        callback: (data: { results: CheckResult[]; isCompliant: boolean }) => void,
      ) => () => void;
    };
  }
}

const CHECK_NAMES: Record<DeviceCheckType, string> = {
  disk_encryption: 'Disk Encryption',
  antivirus: 'Antivirus',
  password_policy: 'Password Policy',
  screen_lock: 'Screen Lock',
};

const CHECK_DESCRIPTIONS: Record<DeviceCheckType, string> = {
  disk_encryption: 'FileVault or BitLocker enabled',
  antivirus: 'Antivirus software active',
  password_policy: 'Minimum 8 character password',
  screen_lock: 'Screen locks within 5 minutes',
};

/** Label for the remediation button based on remediation type */
function getRemediationButtonLabel(info: RemediationInfo): string {
  switch (info.type) {
    case 'auto_fix':
      return 'Fix';
    case 'admin_fix':
      return 'Fix (Admin)';
    case 'open_settings':
      return 'Open Settings';
    case 'guide_only':
      return 'View Guide';
  }
}

/** Icon for the remediation button based on remediation type */
function getRemediationButtonIcon(info: RemediationInfo): React.ReactNode {
  switch (info.type) {
    case 'auto_fix':
    case 'admin_fix':
      return <Settings size={14} />;
    case 'open_settings':
      return <Launch size={14} />;
    case 'guide_only':
      return <ChevronDown size={14} />;
  }
}

/** Individual check card with remediation capabilities */
function CheckCard({
  check,
  remediationInfo,
}: {
  check: CheckResult;
  remediationInfo: RemediationInfo | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);
  const [remediationResult, setRemediationResult] = useState<RemediationResult | null>(null);

  const isGuideOnly = remediationInfo?.type === 'guide_only';

  const handleRemediate = useCallback(async () => {
    // For guide_only, just toggle the instructions panel
    if (isGuideOnly) {
      setIsExpanded((prev) => !prev);
      return;
    }
    setIsRemediating(true);
    setRemediationResult(null);
    try {
      const result = await window.compAgent.remediateCheck(check.checkType);
      setRemediationResult(result);
    } finally {
      setIsRemediating(false);
    }
  }, [check.checkType, isGuideOnly]);

  const showRemediation = !check.passed && remediationInfo?.available;

  return (
    <Card>
      <CardContent>
        {/* Main check row */}
        <Stack direction="row" gap="3" align="center">
          <Stack gap="0">
            <Text size="sm" weight="medium">
              {CHECK_NAMES[check.checkType]}
            </Text>
            <Text size="xs" variant="muted">
              {check.details.message || CHECK_DESCRIPTIONS[check.checkType]}
            </Text>
          </Stack>
          <div className="ml-auto shrink-0">
            <Badge variant={check.passed ? 'default' : 'destructive'}>
              {check.passed ? 'Pass' : 'Fail'}
            </Badge>
          </div>
        </Stack>

        {/* Remediation actions for failing checks */}
        {showRemediation && (
          <div className="mt-3 space-y-2">
            {/* Remediation result feedback */}
            {remediationResult && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${
                  remediationResult.success
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {remediationResult.message}
              </div>
            )}

            {/* Action buttons */}
            <Stack direction="row" gap="2">
              <Button
                size="sm"
                variant={remediationInfo.type === 'auto_fix' ? 'default' : 'outline'}
                onClick={handleRemediate}
                loading={isRemediating}
                iconLeft={isGuideOnly
                  ? (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                  : getRemediationButtonIcon(remediationInfo)}
              >
                {isRemediating
                  ? 'Fixing...'
                  : isGuideOnly
                    ? (isExpanded ? 'Hide Guide' : 'View Guide')
                    : getRemediationButtonLabel(remediationInfo)}
              </Button>

              {!isGuideOnly && remediationInfo.instructions.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  iconRight={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                >
                  {isExpanded ? 'Hide Steps' : 'Show Steps'}
                </Button>
              )}
            </Stack>

            {/* Expandable guided instructions */}
            {isExpanded && remediationInfo.instructions.length > 0 && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
                <ol className="list-inside list-decimal space-y-1">
                  {remediationInfo.instructions.map((step, index) => (
                    <li key={index} className="text-xs text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [isCompliant, setIsCompliant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [remediationInfoMap, setRemediationInfoMap] = useState<Record<string, RemediationInfo>>({});
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  /** Load remediation info from main process */
  const loadRemediationInfo = useCallback(async () => {
    try {
      const infos = await window.compAgent.getRemediationInfo();
      const map: Record<string, RemediationInfo> = {};
      for (const info of infos) {
        map[info.checkType] = info;
      }
      setRemediationInfoMap(map);
    } catch (error) {
      console.error('Failed to load remediation info:', error);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        window.compAgent.getAppVersion().then(setAppVersion).catch(() => {});
        const authStatus = await window.compAgent.getAuthStatus();
        setIsAuthenticated(authStatus.isAuthenticated);
        if (authStatus.isAuthenticated) {
          const [results] = await Promise.all([
            window.compAgent.getCheckResults(),
            loadRemediationInfo(),
          ]);
          setCheckResults(results);
          setIsCompliant(results.length >= 4 && results.every((r) => r.passed));
        }
      } catch (error) {
        console.error('Failed to load initial state:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadRemediationInfo]);

  useEffect(() => {
    const removeAuthListener = window.compAgent.onAuthStateChanged((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        loadRemediationInfo();
      } else {
        setCheckResults([]);
        setIsCompliant(false);
        setRemediationInfoMap({});
      }
    });
    const removeCheckListener = window.compAgent.onCheckResultsUpdated((data) => {
      setCheckResults(data.results as CheckResult[]);
      setIsCompliant(data.isCompliant);
    });
    return () => {
      removeAuthListener();
      removeCheckListener();
    };
  }, [loadRemediationInfo]);

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      await window.compAgent.login();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRunChecks = useCallback(async () => {
    setIsRunning(true);
    try {
      await window.compAgent.runChecksNow();
    } finally {
      setIsRunning(false);
    }
  }, []);

  /** Fix all failing checks that have auto_fix or admin_fix remediation */
  const handleFixAll = useCallback(async () => {
    setIsFixingAll(true);
    try {
      const failingChecks = checkResults.filter((c) => !c.passed);
      const fixableChecks = failingChecks.filter((c) => {
        const info = remediationInfoMap[c.checkType];
        return info?.available && (info.type === 'auto_fix' || info.type === 'admin_fix');
      });

      for (const check of fixableChecks) {
        await window.compAgent.remediateCheck(check.checkType);
      }
    } catch (error) {
      console.error('Fix all failed:', error);
    } finally {
      setIsFixingAll(false);
    }
  }, [checkResults, remediationInfoMap]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Stack gap="3" align="center">
          <LogoIcon width={32} height={32} />
          <Text size="sm" variant="muted">
            Loading...
          </Text>
        </Stack>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <Stack gap="6" align="center">
          <LogoIcon width={40} height={40} />
          <Stack gap="2" align="center">
            <Heading level="3">Comp AI Device Agent</Heading>
            <Text size="sm" variant="muted">
              Sign in to your Comp AI portal to begin device compliance monitoring.
            </Text>
          </Stack>
          <div className="w-full">
            <Button width="full" onClick={handleLogin}>
              Sign In
            </Button>
          </div>
        </Stack>
        <div className="mt-auto pt-8">
          <Text size="xs" variant="muted">
            Comp AI Device Agent {appVersion ? `v${appVersion}` : ''}
          </Text>
        </div>
      </div>
    );
  }

  const passCount = checkResults.filter((c) => c.passed).length;
  const totalCount = checkResults.length;
  const failingChecks = checkResults.filter((c) => !c.passed);
  const hasFixableChecks = failingChecks.some((c) => {
    const info = remediationInfoMap[c.checkType];
    return info?.available && (info.type === 'auto_fix' || info.type === 'admin_fix');
  });

  return (
    <div className="flex h-screen flex-col p-5">
      {/* Header */}
      <Stack direction="row" gap="3" align="center">
        <LogoIcon width={28} height={28} />
        <Stack gap="0">
          <Text size="sm" weight="semibold">
            Comp AI
          </Text>
          <Text size="xs" variant="muted">
            Device Compliance
          </Text>
        </Stack>
      </Stack>

      <div className="my-3">
        <Separator />
      </div>

      {/* Status */}
      <Card>
        <CardContent>
          <Stack direction="row" gap="3" align="center">
            <Stack gap="0">
              <Text size="sm" weight="semibold">
                {isCompliant ? 'Device Compliant' : 'Device Non-Compliant'}
              </Text>
              <Text size="xs" variant="muted">
                {passCount} of {totalCount} checks passing
              </Text>
            </Stack>
            <div className="ml-auto">
              <Badge variant={isCompliant ? 'default' : 'destructive'}>
                {isCompliant ? 'Compliant' : 'Action Required'}
              </Badge>
            </div>
          </Stack>

          {/* Fix All button when there are fixable failing checks */}
          {!isCompliant && hasFixableChecks && (
            <div className="mt-3">
              <Button
                width="full"
                size="sm"
                onClick={handleFixAll}
                loading={isFixingAll}
                iconLeft={<Settings size={14} />}
              >
                {isFixingAll ? 'Fixing...' : 'Fix All Settings'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checks */}
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {checkResults.map((check) => (
          <CheckCard
            key={check.checkType}
            check={check}
            remediationInfo={remediationInfoMap[check.checkType]}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 space-y-3">
        <Button
          width="full"
          variant="outline"
          onClick={handleRunChecks}
          loading={isRunning}
          iconLeft={<Renew size={14} />}
        >
          {isRunning ? 'Running Checks...' : 'Run Checks Now'}
        </Button>
        <div className="text-center">
          <Text size="xs" variant="muted">
            Comp AI Device Agent {appVersion ? `v${appVersion}` : ''}
          </Text>
        </div>
      </div>
    </div>
  );
}

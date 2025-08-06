'use client';

import { cn } from '@comp/ui/cn';
import { useGT } from 'gt-next';
import { InlineTranslationOptions } from 'gt-next/types';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const LINE_LENGTH_TARGET = 85;
const NUM_LINES = 8;
const LINE_HEIGHT = 16;
const SCROLL_DURATION = 1; // 1 second per line

interface MiniDataStreamProps {
  taskType: 'policy' | 'vendor' | 'risk' | 'control' | 'evidence';
  itemTitle: string;
}

const getReasoningTexts = (
  taskType: string,
  itemTitle: string,
  t: (content: string, options?: InlineTranslationOptions) => string
): string[] => {
  switch (taskType) {
    case 'policy':
      return [
        t('Need to ensure {itemTitle} aligns with SOC 2 CC6.1 logical access controls...', { itemTitle }),
        t('Organization uses AWS and Okta, must incorporate cloud-specific requirements.'),
        t('NIST 800-53 suggests implementing AC-2 for account management procedures.'),
        t('Previous audit finding: lack of documented approval workflows. Adding section 4.2.'),
        t('Cross-referencing with ISO 27001 A.9.2.1 - User registration and deregistration.'),
        t('Policy must be actionable for DevOps team, avoiding overly restrictive language.'),
        t('Including specific AWS IAM role examples to make policy concrete and implementable.'),
        t('Data classification levels: Public, Internal, Confidential, Restricted. Mapping access.'),
        t('Legal team requires GDPR Article 32 compliance - adding encryption requirements.'),
        t('Considering zero-trust principles while maintaining operational efficiency.'),
        t('Section 3.1 needs clearer escalation path for access request approvals.'),
        t('Adding quarterly access review requirements based on industry best practices.'),
      ];
    case 'vendor':
      return [
        t('Checking if {itemTitle} has valid SOC 2 Type II report dated within 12 months...', { itemTitle }),
        t('Found security incident from 2023-Q3. Evaluating remediation measures taken.'),
        t('Vendor processes payment data - PCI DSS compliance verification required.'),
        t('Analyzing BAA terms: data deletion within 30 days, encryption at rest confirmed.'),
        t('Subprocessor list includes AWS us-east-1. Checking data residency requirements.'),
        t('API authentication uses OAuth 2.0 with JWT tokens. Reviewing token expiration.'),
        t('Vendor scored 89/100 on last security questionnaire. Identifying gap areas.'),
        t('GDPR DPA signed 2024-01-15. Article 28 obligations appear satisfied.'),
        t('Penetration test report shows two medium findings - both remediated.'),
        t('SLA guarantees 99.9% uptime. Incident response time: 4 hours for critical.'),
        t('Insurance coverage: $10M cyber liability. Adequate for our risk profile.'),
        t('Integration requires read-only API access. Lower risk than write permissions.'),
      ];
    case 'risk':
      return [
        t('{itemTitle} processes approximately 50K customer records monthly...', { itemTitle }),
        t('Threat actor profile: external attackers targeting SaaS credentials via phishing.'),
        t('Current MFA adoption at 87%. Risk reduced but not eliminated.'),
        t('Likelihood: Medium (similar orgs breached 2x per year industry average).'),
        t('Impact: High (potential for PII exposure, regulatory fines up to $2M).'),
        t('Existing controls: WAF, DDoS protection, anomaly detection. Effectiveness: 75%.'),
        t('Residual risk after controls: Medium-Low. Within risk appetite threshold.'),
        t('Supply chain risk: 3 critical vendors with access to production systems.'),
        t('Compliance risk: GDPR enforcement increasing, recent €20M fine for similar breach.'),
        t('Recovery time objective: 4 hours. Current capability: 6 hours. Gap identified.'),
        t('Risk treatment: Accept with monitoring, implement additional logging controls.'),
        t('Quarterly review cycle established. KRI: Failed login attempts > 1000/day.'),
      ];
    case 'control':
      return [
        t('Implementing {itemTitle} using AWS Config rules and Lambda functions...', { itemTitle }),
        t('Control objective: Ensure all S3 buckets have encryption enabled by default.'),
        t('Current state: 67% compliant. Auto-remediation script will fix non-compliant.'),
        t('Testing methodology: Daily automated scans with alerts to security team.'),
        t('False positive rate currently 12%. Tuning detection logic to reduce noise.'),
        t('Evidence collection: CloudTrail logs aggregated to central SIEM for 90 days.'),
        t('Control maps to: SOC 2 CC6.7, ISO 27001 A.10.1.1, NIST 800-53 SC-28.'),
        t('Compensating control: If encryption fails, access restricted to VPN users only.'),
        t('Performance impact measured: <100ms latency added, acceptable for use case.'),
        t('Integration with ticketing system for exception tracking and approval workflow.'),
        t('Monthly control effectiveness review scheduled. Success metric: 95% compliance.'),
        t('Audit trail maintained in immutable storage for 7 years per retention policy.'),
      ];
    case 'evidence':
      return [
        t('Collecting {itemTitle} configuration baselines from production environment...', { itemTitle }),
        t('Screenshot captured: MFA enforcement policy showing "Required for all users".'),
        t('Pulling 30 days of access logs. 1,247 unique authentication events found.'),
        t('Firewall rules exported: 47 rules total, 12 allow inbound, rest deny by default.'),
        t('User access review spreadsheet generated. 234 active users, 18 need verification.'),
        t('Change management tickets: 89 infrastructure changes, all have approval records.'),
        t('Vulnerability scan report: 2 critical, 5 high, 23 medium findings documented.'),
        t('Backup test results: Last successful restore 2024-11-28, RTO met successfully.'),
        t('Security training completion: 96% of employees, 4% have 7 days to complete.'),
        t('Incident response test: Tabletop exercise completed 2024-10-15, report attached.'),
        t('Penetration test evidence: Executive summary and remediation timeline included.'),
        t('System architecture diagram updated 2024-11-01, reflects current state accurately.'),
      ];
    default:
      return [];
  }
};

const generateRelevantLine = (
  taskType: string,
  itemTitle: string,
  t: (content: string, options?: InlineTranslationOptions) => string
): { id: string; text: string; highlight: boolean } => {
  let highlight = Math.random() < 0.15;

  const reasoningTexts = getReasoningTexts(taskType, itemTitle, t);
  const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const fullText = getRandomElement(reasoningTexts);

  return {
    id: `line-${Math.random().toString(36).substr(2, 9)}`,
    text: fullText,
    highlight,
  };
};

export function MiniDataStream({ taskType, itemTitle }: MiniDataStreamProps) {
  const t = useGT();
  const [lines, setLines] = useState(() =>
    Array.from({ length: NUM_LINES }, () => generateRelevantLine(taskType, itemTitle, t)),
  );
  const scrollRef = useRef<number>(0);

  useEffect(() => {
    const updateLines = () => {
      // Only update when we've scrolled exactly one line
      scrollRef.current += 1;
      if (scrollRef.current >= 1) {
        setLines((prev) => [...prev.slice(1), generateRelevantLine(taskType, itemTitle, t)]);
        scrollRef.current = 0;
      }
    };

    // Update lines exactly when animation completes one cycle
    const interval = setInterval(updateLines, SCROLL_DURATION * 1000);

    return () => clearInterval(interval);
  }, [taskType, itemTitle, t]);

  return (
    <div
      className="h-14 w-full bg-muted/30 rounded-md overflow-hidden relative font-mono text-xs leading-relaxed"
      aria-hidden="true"
    >
      <motion.div
        animate={{
          y: [0, -LINE_HEIGHT],
        }}
        transition={{
          y: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: SCROLL_DURATION,
            ease: 'linear',
          },
        }}
        className="py-1"
      >
        {/* Render extra lines to ensure smooth scrolling */}
        {[...lines, lines[0]].map((line, index) => (
          <div
            key={`${line.id}-${index}`}
            className={cn(
              'whitespace-nowrap px-3 truncate',
              line.highlight ? 'text-primary opacity-90' : 'text-muted-foreground/60',
            )}
            style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
          >
            {line.text}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

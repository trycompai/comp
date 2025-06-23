'use client';

import { cn } from '@comp/ui/cn';
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

const generateRelevantLine = (
  taskType: string,
  itemTitle: string,
): { id: string; text: string; highlight: boolean } => {
  const textFragments: string[] = [];
  let highlight = Math.random() < 0.15;

  const policyReasoning = [
    `Need to ensure ${itemTitle} aligns with SOC 2 CC6.1 logical access controls...`,
    'Organization uses AWS and Okta, must incorporate cloud-specific requirements.',
    'NIST 800-53 suggests implementing AC-2 for account management procedures.',
    'Previous audit finding: lack of documented approval workflows. Adding section 4.2.',
    'Cross-referencing with ISO 27001 A.9.2.1 - User registration and deregistration.',
    'Policy must be actionable for DevOps team, avoiding overly restrictive language.',
    'Including specific AWS IAM role examples to make policy concrete and implementable.',
    'Data classification levels: Public, Internal, Confidential, Restricted. Mapping access.',
    'Legal team requires GDPR Article 32 compliance - adding encryption requirements.',
    'Considering zero-trust principles while maintaining operational efficiency.',
    'Section 3.1 needs clearer escalation path for access request approvals.',
    'Adding quarterly access review requirements based on industry best practices.',
  ];

  const vendorReasoning = [
    `Checking if ${itemTitle} has valid SOC 2 Type II report dated within 12 months...`,
    'Found security incident from 2023-Q3. Evaluating remediation measures taken.',
    'Vendor processes payment data - PCI DSS compliance verification required.',
    'Analyzing BAA terms: data deletion within 30 days, encryption at rest confirmed.',
    'Subprocessor list includes AWS us-east-1. Checking data residency requirements.',
    'API authentication uses OAuth 2.0 with JWT tokens. Reviewing token expiration.',
    'Vendor scored 89/100 on last security questionnaire. Identifying gap areas.',
    'GDPR DPA signed 2024-01-15. Article 28 obligations appear satisfied.',
    'Penetration test report shows two medium findings - both remediated.',
    'SLA guarantees 99.9% uptime. Incident response time: 4 hours for critical.',
    'Insurance coverage: $10M cyber liability. Adequate for our risk profile.',
    'Integration requires read-only API access. Lower risk than write permissions.',
  ];

  const riskReasoning = [
    `${itemTitle} processes approximately 50K customer records monthly...`,
    'Threat actor profile: external attackers targeting SaaS credentials via phishing.',
    'Current MFA adoption at 87%. Risk reduced but not eliminated.',
    'Likelihood: Medium (similar orgs breached 2x per year industry average).',
    'Impact: High (potential for PII exposure, regulatory fines up to $2M).',
    'Existing controls: WAF, DDoS protection, anomaly detection. Effectiveness: 75%.',
    'Residual risk after controls: Medium-Low. Within risk appetite threshold.',
    'Supply chain risk: 3 critical vendors with access to production systems.',
    'Compliance risk: GDPR enforcement increasing, recent €20M fine for similar breach.',
    'Recovery time objective: 4 hours. Current capability: 6 hours. Gap identified.',
    'Risk treatment: Accept with monitoring, implement additional logging controls.',
    'Quarterly review cycle established. KRI: Failed login attempts > 1000/day.',
  ];

  const controlReasoning = [
    `Implementing ${itemTitle} using AWS Config rules and Lambda functions...`,
    'Control objective: Ensure all S3 buckets have encryption enabled by default.',
    'Current state: 67% compliant. Auto-remediation script will fix non-compliant.',
    'Testing methodology: Daily automated scans with alerts to security team.',
    'False positive rate currently 12%. Tuning detection logic to reduce noise.',
    'Evidence collection: CloudTrail logs aggregated to central SIEM for 90 days.',
    'Control maps to: SOC 2 CC6.7, ISO 27001 A.10.1.1, NIST 800-53 SC-28.',
    'Compensating control: If encryption fails, access restricted to VPN users only.',
    'Performance impact measured: <100ms latency added, acceptable for use case.',
    'Integration with ticketing system for exception tracking and approval workflow.',
    'Monthly control effectiveness review scheduled. Success metric: 95% compliance.',
    'Audit trail maintained in immutable storage for 7 years per retention policy.',
  ];

  const evidenceReasoning = [
    `Collecting ${itemTitle} configuration baselines from production environment...`,
    'Screenshot captured: MFA enforcement policy showing "Required for all users".',
    'Pulling 30 days of access logs. 1,247 unique authentication events found.',
    'Firewall rules exported: 47 rules total, 12 allow inbound, rest deny by default.',
    'User access review spreadsheet generated. 234 active users, 18 need verification.',
    'Change management tickets: 89 infrastructure changes, all have approval records.',
    'Vulnerability scan report: 2 critical, 5 high, 23 medium findings documented.',
    'Backup test results: Last successful restore 2024-11-28, RTO met successfully.',
    'Security training completion: 96% of employees, 4% have 7 days to complete.',
    'Incident response test: Tabletop exercise completed 2024-10-15, report attached.',
    'Penetration test evidence: Executive summary and remediation timeline included.',
    'System architecture diagram updated 2024-11-01, reflects current state accurately.',
  ];

  const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  switch (taskType) {
    case 'policy':
      textFragments.push(getRandomElement(policyReasoning));
      break;
    case 'vendor':
      textFragments.push(getRandomElement(vendorReasoning));
      break;
    case 'risk':
      textFragments.push(getRandomElement(riskReasoning));
      break;
    case 'control':
      textFragments.push(getRandomElement(controlReasoning));
      break;
    case 'evidence':
      textFragments.push(getRandomElement(evidenceReasoning));
      break;
  }

  const fullText = textFragments[0];

  return {
    id: `line-${Math.random().toString(36).substr(2, 9)}`,
    text: fullText,
    highlight,
  };
};

export function MiniDataStream({ taskType, itemTitle }: MiniDataStreamProps) {
  const [lines, setLines] = useState(() =>
    Array.from({ length: NUM_LINES }, () => generateRelevantLine(taskType, itemTitle)),
  );
  const scrollRef = useRef<number>(0);

  useEffect(() => {
    const updateLines = () => {
      // Only update when we've scrolled exactly one line
      scrollRef.current += 1;
      if (scrollRef.current >= 1) {
        setLines((prev) => [...prev.slice(1), generateRelevantLine(taskType, itemTitle)]);
        scrollRef.current = 0;
      }
    };

    // Update lines exactly when animation completes one cycle
    const interval = setInterval(updateLines, SCROLL_DURATION * 1000);

    return () => clearInterval(interval);
  }, [taskType, itemTitle]);

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

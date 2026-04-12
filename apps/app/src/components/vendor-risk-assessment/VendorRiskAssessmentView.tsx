'use client';

import { Stack, Text } from '@trycompai/design-system';
import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { parseVendorRiskAssessmentDescription } from './parse-vendor-risk-assessment-description';
import { filterCertifications } from './filter-certifications';
import { VendorRiskAssessmentTimelineCard } from './VendorRiskAssessmentTimelineCard';
import { SecurityAssessmentContent } from './SecurityAssessmentContent';

export type VendorRiskAssessmentViewSource = {
  title: string;
  description: string | null | undefined;
  createdAt: string;
  entityType?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

export function VendorRiskAssessmentView({ source }: { source: VendorRiskAssessmentViewSource }) {
  const data = useMemo(() => {
    return parseVendorRiskAssessmentDescription(source.description);
  }, [source.description]);

  const certifications = data?.certifications ?? [];
  const filteredCerts = useMemo(() => filterCertifications(certifications), [certifications]);
  const links = data?.links ?? [];
  const news = data?.news ?? [];

  // Merge certs and links into one flat list
  const allItems = [
    ...filteredCerts.map((cert) => ({
      label: cert.type,
      url: cert.url ?? null,
    })),
    ...links.map((link) => ({
      label: link.label,
      url: link.url,
    })),
  ];

  return (
    <Stack gap="lg">
      {/* Security & Compliance — plain text list at the top */}
      {allItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <UsefulLinksSection items={allItems} />
        </motion.div>
      )}

      {/* Security Assessment */}
      {allItems.length > 0 && <div className="border-t border-border" />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: allItems.length > 0 ? 0.1 : 0 }}
      >
        <Stack gap="sm">
          <Text size="lg" weight="semibold">Security Assessment</Text>
          {data?.securityAssessment ? (
            <SecurityAssessmentContent
              text={
                data.securityAssessment.includes('Framework-specific checks:')
                  ? data.securityAssessment.split('Framework-specific checks:')[0].trim()
                  : data.securityAssessment
              }
            />
          ) : (
            <Text size="sm" variant="muted">No automated security assessment found.</Text>
          )}
        </Stack>
      </motion.div>

      {/* Timeline */}
      {news.length > 0 && (
        <>
          <div className="border-t border-border" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <VendorRiskAssessmentTimelineCard news={news} previewCount={2} flat />
          </motion.div>
        </>
      )}
    </Stack>
  );
}

const VISIBLE_COUNT = 3;

function UsefulLinksSection({ items }: { items: Array<{ label: string; url: string | null }> }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > VISIBLE_COUNT;
  const visible = expanded ? items : items.slice(0, VISIBLE_COUNT);

  return (
    <Stack gap="sm">
      <Text size="lg" weight="semibold">Useful Links</Text>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
        {visible.map((item, i) =>
          item.url ? (
            <div key={`${item.label}-${i}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-normal underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
              >
                {item.label}
              </a>
            </div>
          ) : (
            <div key={`${item.label}-${i}`}>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ),
        )}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <span>{expanded ? 'Show less' : `Show ${items.length - VISIBLE_COUNT} more`}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </Stack>
  );
}

import { Checkmark } from '@trycompai/design-system/icons';
import { ReportCover } from './ReportCover';
import { ReportDetailPage } from './ReportDetailPage';
import { ReportExecSummary } from './ReportExecSummary';

const CHECKLIST = [
  'Cover sheet · assessment period · reference',
  'Per-finding evidence, PoC, and remediation',
  'Executive summary with severity counter',
  'Findings table with confirmed / potential',
  'Framework control mapping appendix',
  'Reissued on retest, no extra cost',
];

const PAGES = [
  { node: <ReportCover />, label: '1 · Cover' },
  { node: <ReportExecSummary />, label: '2 · Executive summary' },
  { node: <ReportDetailPage />, label: '8 · Finding detail' },
];

/**
 * The "what you take away" deliverable section — a muted card containing a
 * centered intro, three scaled-down PDF page thumbnails, and a checklist of
 * what ships inside the report. Pen-test-specific because the page mocks
 * mirror the actual pentest report template.
 */
export function ReportPreviewSpread() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-muted/55 p-5 sm:gap-7 sm:p-7 lg:p-9">
      <div className="max-w-[640px] text-center">
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          The deliverable
        </div>
        <div className="mb-2.5 text-[20px] font-normal leading-[1.25] tracking-[-0.01em] sm:text-[22px] lg:text-[24px]">
          Every completed scan ships a signed PDF report — the same document you&apos;d give an
          external pentest firm.
        </div>
        <p className="m-0 text-[13px] leading-[1.6] text-muted-foreground">
          Executive summary, scope &amp; methodology, findings table, per-finding detail with
          evidence, remediation, and references — wired to your SOC 2 or ISO 27001 controls.
          Generated at the end of every scan and re-issued on retest.
        </p>
      </div>
      <div className="flex w-full flex-wrap items-end justify-center gap-4 overflow-x-auto">
        {PAGES.map((p) => (
          <div key={p.label} className="flex flex-col items-center gap-2">
            {p.node}
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {p.label}
            </div>
          </div>
        ))}
      </div>
      <ul className="grid w-full max-w-[860px] list-none grid-cols-1 gap-x-6 gap-y-2 border-t border-border p-0 pt-5 sm:gap-y-1.5 sm:pt-6 md:grid-cols-2">
        {CHECKLIST.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[12.5px] leading-[1.45]">
            <span className="mt-0.5 shrink-0 text-primary">
              <Checkmark size={14} />
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

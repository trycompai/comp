'use client';

import { Text } from '@trycompai/design-system';
import { getRiskLevelFromScore, LEVEL_COLOR, LEVEL_LABEL } from '@/lib/risk-score';

/**
 * Read-only preview of the 5x5 risk level matrix rendered into the 6.1.2
 * document. Computed from the SAME banding the product's badges and
 * treatment-plan hero use (risk-score.ts getRiskLevelFromScore over the
 * normalized 1-10 score) — deliberately not editable, so the document can
 * never contradict the product's real behavior. Rows run likelihood 5 -> 1,
 * matching the exported document.
 */
export function RiskLevelMatrixPreview() {
  const likelihoodRows = [5, 4, 3, 2, 1];
  const impactColumns = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border bg-muted/50 p-2 text-left font-medium" />
              {impactColumns.map((impact) => (
                <th key={impact} className="border bg-muted/50 p-2 text-left font-medium">
                  Impact {impact}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {likelihoodRows.map((likelihood) => (
              <tr key={likelihood}>
                <th className="border bg-muted/50 p-2 text-left font-medium">
                  Likelihood {likelihood}
                </th>
                {impactColumns.map((impact) => {
                  const level = getRiskLevelFromScore(
                    Math.max(1, Math.ceil((likelihood * impact) / 2.5)),
                  );
                  return (
                    <td key={impact} className="border p-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="inline-block size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: LEVEL_COLOR[level] }}
                        />
                        {LEVEL_LABEL[level]}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Text variant="muted">
        Computed from likelihood x impact (1-25), normalized to the same 1-10 score the risk
        badges use (score bands: Very low 1-2, Low 3-4, Medium 5-6, High 7-8, Very high 9-10 —
        i.e. raw products 1-5, 6-10, 11-15, 16-20, 21-25). This table renders into the document
        and is not editable.
      </Text>
    </div>
  );
}

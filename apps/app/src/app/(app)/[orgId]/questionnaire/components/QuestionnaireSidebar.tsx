'use client';

import {
  FileSpreadsheet,
  FileText,
  FileText as FileTextIcon,
} from 'lucide-react';

export function QuestionnaireSidebar() {
  return (
    <div className="hidden lg:flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Accepted Files
        </h4>
        <div className="flex flex-col gap-2">
          {[
            { icon: FileText, label: 'PDF', desc: 'Adobe PDF documents' },
            { icon: FileSpreadsheet, label: 'Excel', desc: 'XLS, XLSX spreadsheets' },
            { icon: FileTextIcon, label: 'CSV', desc: 'Comma-separated data' },
          ].map((format, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-xs hover:bg-muted/30 transition-colors"
            >
              <format.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{format.label}</p>
                <p className="text-xs text-muted-foreground">{format.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 rounded-xs bg-muted/20">
        <p className="text-xs font-medium text-foreground">Quick Tips</p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Files up to 10MB are supported</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Ensure questions are clearly formatted</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Structured tables work best</span>
          </li>
        </ul>
      </div>
    </div>
  );
}


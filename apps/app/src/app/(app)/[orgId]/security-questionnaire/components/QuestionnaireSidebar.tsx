"use client";

import {
  FileSpreadsheet,
  FileText,
  FileText as FileTextIcon,
} from "lucide-react";

export function QuestionnaireSidebar() {
  return (
    <div className="hidden flex-col gap-6 lg:flex">
      <div className="flex flex-col gap-3">
        <h4 className="text-foreground text-xs font-semibold tracking-wide uppercase">
          Accepted Files
        </h4>
        <div className="flex flex-col gap-2">
          {[
            { icon: FileText, label: "PDF", desc: "Adobe PDF documents" },
            {
              icon: FileSpreadsheet,
              label: "Excel",
              desc: "XLS, XLSX spreadsheets",
            },
            { icon: FileTextIcon, label: "CSV", desc: "Comma-separated data" },
          ].map((format, index) => (
            <div
              key={index}
              className="hover:bg-muted/30 flex items-center gap-3 rounded-xs p-2 transition-colors"
            >
              <format.icon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs font-medium">
                  {format.label}
                </p>
                <p className="text-muted-foreground text-xs">{format.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/20 flex flex-col gap-2 rounded-xs p-4">
        <p className="text-foreground text-xs font-medium">Quick Tips</p>
        <ul className="text-muted-foreground space-y-1.5 text-xs">
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

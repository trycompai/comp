import { FileIcon } from 'lucide-react';

export function CodeWriter(props: { filename?: string; className?: string }) {
  const lines = [
    'const run = async () => {',
    "  const res = await fetch('https://api.example.com');",
    '  const data = await res.json()',
    '  return { ok: true, data }',
    '}',
  ];

  return (
    <div
      className={
        'mt-2 border border-primary/15 bg-muted/30 dark:bg-muted/20 rounded-xs p-2 font-mono text-[11px] leading-4 text-muted-foreground'
      }
    >
      {props.filename && (
        <div className="flex items-center mb-1 text-[10px] text-muted-foreground/80">
          <FileIcon className="w-3 h-3 mr-1" />
          <span className="truncate">{props.filename}</span>
        </div>
      )}
      <div className="space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-1.5 animate-pulse" />
            <div className="flex-1">
              <span className="opacity-70">{l}</span>
              {i === lines.length - 1 && (
                <span className="inline-block w-2 h-3 bg-primary/70 ml-1 animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

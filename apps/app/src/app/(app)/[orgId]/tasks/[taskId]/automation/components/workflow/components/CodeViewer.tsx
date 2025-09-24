'use client';

import { Code2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/30 flex items-center justify-center animate-pulse">
          <Code2 className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    </div>
  ),
});

interface Props {
  content: string;
  isLoading?: boolean;
}

export function CodeViewer({ content, isLoading }: Props) {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    // Detect Tailwind's dark class or system preference as a fallback
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(hasDarkClass || prefersDark);
  }, []);

  const editorTheme = useMemo(() => (isDark ? 'vs-dark' : 'vs'), [isDark]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/30 flex items-center justify-center animate-pulse">
            <Code2 className="w-6 h-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground">Loading code...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Code2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No code to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-full rounded-sm overflow-hidden border border-border/40">
      <MonacoEditor
        value={content}
        language="javascript"
        theme={editorTheme}
        options={{
          readOnly: true,
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          minimap: { enabled: false },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          automaticLayout: true,
          smoothScrolling: true,
          fontSize: 13,
        }}
        height="100vh"
      />
    </div>
  );
}

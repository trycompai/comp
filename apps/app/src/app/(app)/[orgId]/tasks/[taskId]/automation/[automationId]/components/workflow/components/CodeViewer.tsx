"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Code2 } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="bg-muted/30 mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-xl">
          <Code2 className="text-muted-foreground/60 h-6 w-6" />
        </div>
        <p className="text-muted-foreground text-sm">Loading editor...</p>
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
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(hasDarkClass || prefersDark);
  }, []);

  const editorTheme = useMemo(() => (isDark ? "vs-dark" : "vs"), [isDark]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="bg-muted/30 mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-xl">
            <Code2 className="text-muted-foreground/60 h-6 w-6" />
          </div>
          <p className="text-muted-foreground text-sm">Loading code...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Code2 className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-muted-foreground">No code to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/40 h-full min-h-full overflow-hidden rounded-sm border">
      <MonacoEditor
        value={content}
        language="javascript"
        theme={editorTheme}
        options={{
          readOnly: true,
          wordWrap: "on",
          wrappingStrategy: "advanced",
          minimap: { enabled: false },
          lineNumbers: "on",
          renderLineHighlight: "line",
          automaticLayout: true,
          smoothScrolling: true,
          fontSize: 13,
        }}
        height="100vh"
      />
    </div>
  );
}

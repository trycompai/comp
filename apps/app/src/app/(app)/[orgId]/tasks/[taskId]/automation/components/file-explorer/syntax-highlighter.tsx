import { useEffect, useState } from 'react';
import Prism from 'react-syntax-highlighter';
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import atomOneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light';

export function SyntaxHighlighter(props: { path: string; code: string }) {
  const lang = detectLanguageFromFilename(props.path);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isHtmlDark = document.documentElement.classList.contains('dark');
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsDark(isHtmlDark || mq.matches);
    update();
    const handler = (e: MediaQueryListEvent) => setIsDark(isHtmlDark || e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return (
    <Prism
      language={lang ?? 'javascript'}
      style={isDark ? atomOneDark : atomOneLight}
      showLineNumbers
      showInlineLineNumbers
      customStyle={{
        fontSize: '0.875rem',
        margin: 0,
        background: 'transparent',
      }}
      codeTagProps={{
        style: {
          whiteSpace: 'pre',
          overflowX: 'auto',
        },
      }}
    >
      {props.code}
    </Prism>
  );
}

function detectLanguageFromFilename(path: string): string {
  const pathParts = path.split('/');
  const extension = pathParts[pathParts.length - 1]?.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'jsx',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    mjs: 'javascript',
    cjs: 'javascript',

    // Python
    py: 'python',
    pyw: 'python',
    pyi: 'python',

    // Web technologies
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',

    // Other popular languages
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cxx: 'cpp',
    cc: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',

    // Data formats
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',

    // Markup
    md: 'markdown',
    markdown: 'markdown',
    tex: 'latex',

    // Database
    sql: 'sql',

    // Config files
    dockerfile: 'dockerfile',
    gitignore: 'bash',
    env: 'bash',
  };

  return extensionMap[extension || ''] || 'text';
}

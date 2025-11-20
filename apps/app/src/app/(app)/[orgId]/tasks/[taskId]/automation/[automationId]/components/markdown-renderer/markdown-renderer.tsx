import type { Components } from "react-markdown";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: {
  content: string;
}) {
  const components = useMemo<Components>(
    () => ({
      a: ({ children, href, ...props }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
      code: ({ children, className, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        return match ? (
          <code
            className={`${className} bg-muted rounded px-1 py-0.5 font-mono text-sm`}
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            className="bg-muted rounded px-1 py-0.5 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children, ...props }) => (
        <pre
          className="bg-muted overflow-x-auto rounded-sm p-3 text-sm"
          {...props}
        >
          {children}
        </pre>
      ),
      h1: ({ children, ...props }) => (
        <h1 className="text-lg font-semibold" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-base font-semibold" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-sm font-semibold" {...props}>
          {children}
        </h3>
      ),
      ul: ({ children, ...props }) => (
        <ul className="flex list-disc flex-col gap-0 pl-4" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="flex list-decimal flex-col gap-0 pl-4" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="leading-tight" {...props}>
          {children}
        </li>
      ),
      p: ({ children, ...props }) => (
        <p className="leading-relaxed" {...props}>
          {children}
        </p>
      ),
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="border-muted flex flex-col gap-1 border-l-4 pl-4 italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
    }),
    [],
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
});

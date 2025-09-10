import { type FC, memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';

export const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.components === nextProps.components &&
    prevProps.remarkPlugins === nextProps.remarkPlugins &&
    prevProps.rehypePlugins === nextProps.rehypePlugins,
);

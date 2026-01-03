import * as React from 'react';

function AspectRatio({
  ratio,
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className="relative aspect-(--ratio)"
      {...props}
    />
  );
}

export { AspectRatio };

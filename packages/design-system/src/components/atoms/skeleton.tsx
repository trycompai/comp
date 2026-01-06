function Skeleton({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="skeleton" className="bg-muted rounded-md animate-pulse" {...props} />;
}

export { Skeleton };

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import * as React from 'react';

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { buttonVariants } from './button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('gap-1 flex items-center', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'default' | 'icon';
} & Omit<React.ComponentProps<'a'>, 'className'>;

function PaginationLink({ isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <ButtonPrimitive
      className={buttonVariants({ variant: isActive ? 'outline' : 'ghost', size })}
      render={
        <a
          aria-current={isActive ? 'page' : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  );
}

function PaginationPrevious({ ...props }: Omit<PaginationLinkProps, 'size'>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'pl-2')}
      render={<a aria-label="Go to previous page" data-slot="pagination-link" {...props} />}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">Previous</span>
    </ButtonPrimitive>
  );
}

function PaginationNext({ ...props }: Omit<PaginationLinkProps, 'size'>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'pr-2')}
      render={<a aria-label="Go to next page" data-slot="pagination-link" {...props} />}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon data-icon="inline-end" />
    </ButtonPrimitive>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

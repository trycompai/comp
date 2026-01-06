import { Button as ButtonPrimitive } from '@base-ui/react/button';

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { buttonVariants } from '../atoms/button';

function Pagination({ ...props }: Omit<React.ComponentProps<'nav'>, 'className'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className="mx-auto flex w-full justify-center"
      {...props}
    />
  );
}

function PaginationContent({ ...props }: Omit<React.ComponentProps<'ul'>, 'className'>) {
  return (
    <ul data-slot="pagination-content" className="gap-1 flex items-center" {...props} />
  );
}

function PaginationItem({ ...props }: Omit<React.ComponentProps<'li'>, 'className'>) {
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
      className={`${buttonVariants({ variant: 'ghost', size: 'default' })} pl-2`}
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
      className={`${buttonVariants({ variant: 'ghost', size: 'default' })} pr-2`}
      render={<a aria-label="Go to next page" data-slot="pagination-link" {...props} />}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon data-icon="inline-end" />
    </ButtonPrimitive>
  );
}

function PaginationEllipsis({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className="size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center"
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

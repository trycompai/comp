'use client';

import { cn } from '@trycompai/ui-shadcn';
import { Reorder, motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const icons = {
  '/': () => <LayoutDashboard className="h-[22px] w-[22px]" />,
};

interface ItemProps {
  item: { path: string; name: string; disabled: boolean };
  isActive: boolean;
  onSelect?: () => void;
  disabled: boolean;
}

const Item = ({ item, isActive, onSelect, disabled }: ItemProps) => {
  const Icon = icons[item.path as keyof typeof icons];
  const linkDisabled = disabled || item.disabled;

  return linkDisabled ? (
    <div className="flex h-[45px] w-[45px] items-center justify-center text-xs text-muted-foreground">
      Coming
    </div>
  ) : (
    <Link prefetch href={item.path} onClick={() => onSelect?.()} title={item.name}>
      <Reorder.Item
        key={item.path}
        value={item}
        id={item.path}
        layoutRoot
        className={cn(
          'relative flex h-[45px] items-center justify-center rounded-md border border-transparent md:w-[45px]',
          'hover:bg-accent hover:border-border',
          isActive && 'bg-muted border-border',
        )}
      >
        <motion.div
          className="relative"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center gap-2">
            <Icon />
            <span className="flex md:hidden">{item.name}</span>
          </div>
        </motion.div>
      </Reorder.Item>
    </Link>
  );
};

const listVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

type Props = {
  initialItems?: { path: string; name: string; disabled: boolean }[];
  onSelect?: () => void;
};

export function MainMenu({ initialItems, onSelect }: Props) {
  const defaultItems = [
    {
      path: '/',
      name: 'Frameworks',
      disabled: false,
    },
  ];

  const [items, setItems] = useState(initialItems ?? defaultItems);
  const pathname = usePathname();
  const part = pathname?.split('/')[1];

  const hiddenItems = defaultItems.filter((item) => !items.some((i) => i.path === item.path));

  const onReorder = (
    items: {
      path: string;
      name: string;
      disabled: boolean;
    }[],
  ) => {
    setItems(items);
  };

  return (
    <div className="mt-6">
      <nav>
        <Reorder.Group
          axis="y"
          onReorder={onReorder}
          values={items}
          className="flex flex-col gap-1.5"
        >
          {items
            .filter((item) => !item.disabled)
            .map((item) => {
              const isActive =
                (pathname === '/' && item.path === '/') ||
                (pathname !== '/' && item.path.startsWith(`/${part}`));

              return (
                <Item
                  key={item.path}
                  item={item}
                  isActive={isActive}
                  onSelect={onSelect}
                  disabled={item.disabled}
                />
              );
            })}
        </Reorder.Group>
      </nav>
    </div>
  );
}

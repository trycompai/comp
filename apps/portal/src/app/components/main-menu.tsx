'use client';

import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { Reorder, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const icons = {
  '/': () => <Icons.Overview size={22} />,
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

  return (
    <TooltipProvider delayDuration={70}>
      {linkDisabled ? (
        <div className="flex h-[45px] w-[45px] items-center md:justify-center">Coming</div>
      ) : (
        <Link prefetch href={item.path} onClick={() => onSelect?.()}>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <Reorder.Item
                key={item.path}
                value={item}
                id={item.path}
                layoutRoot
                className={cn(
                  'relative flex h-[45px] items-center border border-transparent md:w-[45px] md:justify-center',
                  'hover:bg-accent hover:border-[#DCDAD2] hover:dark:border-[#2C2C2C]',
                  isActive &&
                    'dark:bg-secondary border-[#DCDAD2] bg-[#F2F1EF] dark:border-[#2C2C2C]',
                )}
              >
                <motion.div
                  className="relative"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div>
                    <Icon />
                    <span className="flex md:hidden">{item.name}</span>
                  </div>
                </motion.div>
              </Reorder.Item>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="hidden px-3 py-1.5 text-xs md:flex"
              sideOffset={10}
            >
              {item.name}
            </TooltipContent>
          </Tooltip>
        </Link>
      )}
    </TooltipProvider>
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

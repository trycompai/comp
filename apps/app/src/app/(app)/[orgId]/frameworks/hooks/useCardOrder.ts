'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'frameworks-cards-order';

export function useCardOrder(defaultOrder: number[]) {
  const [order, setOrder] = useState<number[]>(() => {
    if (typeof window === 'undefined') return defaultOrder;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultOrder;
    } catch {
      return defaultOrder;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    }
  }, [order]);

  const updateOrder = (newOrder: number[]) => {
    setOrder(newOrder);
  };

  return { order, updateOrder };
}

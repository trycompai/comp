import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isJSON(str: string) {
  if (!str) return false;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch (e) {
    return false;
  }
}

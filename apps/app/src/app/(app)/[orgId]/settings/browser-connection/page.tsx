import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Browser Connection',
};

export default function BrowserConnectionPage() {
  return notFound();
}

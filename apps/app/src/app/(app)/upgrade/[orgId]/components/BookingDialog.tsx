'use client';

import { STRIPE_SUB_CACHE } from '@/app/api/stripe/stripeDataToKv.type';
import CalendarEmbed from '@/components/calendar-embed';
import { Button } from '@comp/ui/button';
import { Dialog, DialogContent, DialogOverlay, DialogTrigger } from '@comp/ui/dialog';
import { CalendarDays } from 'lucide-react';

export function BookingDialog({ subscription }: { subscription?: STRIPE_SUB_CACHE }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm">
          {subscription?.status === 'none' ||
          subscription?.status === 'self-serve' ||
          !subscription?.status ? (
            <>
              <CalendarDays className="h-4 w-4" />
              Schedule a demo
            </>
          ) : (
            <>
              <CalendarDays className="h-4 w-4" />
              Schedule a call
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogOverlay className="backdrop-blur-xs">
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] h-[70vh] p-0 overflow-y-auto bg-transparent border-none">
          <CalendarEmbed />
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
}

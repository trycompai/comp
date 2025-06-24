'use client';

import CalendarEmbed from '@/components/calendar-embed';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import { Phone } from 'lucide-react';

export function BookingDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Phone className="h-4 w-4" />
          Book a Call with Our Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] h-[70vh] p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-8 py-6 border-b">
            <DialogTitle className="text-xl font-semibold">
              Schedule a Call with Our Compliance Experts
            </DialogTitle>
            <DialogDescription className="mt-2">
              Have questions about our plans? Want to learn how we can help you achieve compliance
              in 14 days? Book a call with our team.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 mx-auto w-full">
            <CalendarEmbed />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

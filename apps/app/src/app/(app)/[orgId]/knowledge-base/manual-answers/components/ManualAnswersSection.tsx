'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Card } from '@comp/ui';
import { FileQuestion } from 'lucide-react';
import { useRef } from 'react';

export function ManualAnswersSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleAccordionChange = (value: string) => {
    // If opening (value is set), scroll to section
    if (value === 'manual-answers' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100); // Small delay to allow accordion animation to start
    }
  };

  return (
    <Card ref={sectionRef} id="manual-answers">
      <Accordion type="single" collapsible className="w-full" onValueChange={handleAccordionChange}>
        <AccordionItem value="manual-answers" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Manual Answers</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="py-4 text-center text-sm text-muted-foreground">
              Coming soon
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@trycompai/design-system';

export function DeviceAgentInfoAccordion() {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Accordion multiple>
        <AccordionItem value="system-requirements">
          <AccordionTrigger className="px-3 py-3 hover:no-underline">
            <span className="text-sm font-medium">System Requirements</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pt-1">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Operating Systems:</span> macOS 14+,
                Windows 10+
              </p>
              <p>
                <span className="font-semibold text-foreground">Memory:</span> 512MB RAM minimum
              </p>
              <p>
                <span className="font-semibold text-foreground">Storage:</span> 200MB available disk
                space
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="about-device-monitor">
          <AccordionTrigger className="px-3 py-3 hover:no-underline">
            <span className="text-sm font-medium">About Comp AI Device Monitor</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pt-1">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Comp AI Device Monitor is a lightweight agent that helps ensure your device meets
                security compliance requirements.
              </p>
              <p>
                It monitors device configuration, installed software, and security settings to help
                maintain a secure work environment.
              </p>
              <p>
                <span className="font-semibold text-foreground">Security powered by Comp AI:</span>{' '}
                Your organization uses Comp AI to maintain security and compliance standards.
              </p>
              <p className="text-xs">If you have questions, contact your IT administrator.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

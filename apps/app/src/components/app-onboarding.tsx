'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { BookOpen, HelpCircle, PlusIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { useQueryState } from 'nuqs';

interface FAQ {
  questionKey: string;
  answerKey: string;
}

type Props = {
  title: string;
  description: string;
  cta?: string;
  imageSrcLight: string;
  imageSrcDark: string;
  imageAlt: string;
  faqs?: FAQ[];
  sheetName?: string;
  href?: string;
  ctaDisabled?: boolean;
  ctaTooltip?: string;
};

export function AppOnboarding({
  title,
  description,
  cta,
  imageSrcLight,
  imageSrcDark,
  imageAlt,
  faqs,
  sheetName,
  href,
  ctaDisabled = false,
  ctaTooltip,
}: Props) {
  const [open, setOpen] = useQueryState(sheetName ?? 'sheet');
  const isOpen = Boolean(open);
  const { theme } = useTheme();

  return (
    <Card className="w-full overflow-hidden border">
      <div className="flex flex-col lg:min-h-[600px]">
        <div className="flex-1 p-6">
          <div className="flex flex-col">
            <CardHeader className="flex-none space-y-3 px-0">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    {title}
                    <Badge variant="outline" className="text-xs">
                      New
                    </Badge>
                    <Badge className="hidden self-start bg-blue-100 text-blue-800 sm:flex sm:shrink-0 sm:self-auto dark:bg-blue-900/30 dark:text-blue-400">
                      Recommended
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground max-w-xl text-base">
                    {description}
                  </CardDescription>
                </div>
              </div>

              <div className="bg-secondary/50 relative mt-4 h-1 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full transition-all" style={{ width: '5%' }} />
              </div>
            </CardHeader>

            <CardContent className="flex h-full min-h-full flex-1 flex-col overflow-hidden px-0 pt-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="flex flex-col">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="text-primary h-4 w-4" />
                    <p className="text-md font-medium">{'Learn More'}</p>
                  </div>

                  {faqs && faqs.length > 0 && (
                    <Accordion type="single" collapsible className="w-full divide-y">
                      {faqs.map((faq) => (
                        <AccordionItem
                          key={faq.questionKey}
                          value={faq.questionKey}
                          className="border-b-0 px-0"
                        >
                          <AccordionTrigger className="hover:bg-muted/30 px-2 py-3">
                            <div className="flex items-center gap-2 text-left">
                              <HelpCircle className="text-muted-foreground h-4 w-4 shrink-0" />
                              <span>{faq.questionKey}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-muted my-2 ml-6 border-l-2 px-2">
                            {faq.answerKey}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}

                  {cta && (
                    <div className="mt-4 flex w-full">
                      <TooltipProvider delayDuration={100}>
                      {href ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`w-full ${ctaDisabled ? 'cursor-not-allowed' : ''}`}>
                        <Link href={href}>
                                  <Button
                                    variant="default"
                                    className={`flex w-full items-center gap-2 ${ctaDisabled ? 'cursor-not-allowed' : ''}`}
                                    disabled={ctaDisabled}
                                  >
                            <PlusIcon className="h-4 w-4" />
                            {cta}
                          </Button>
                        </Link>
                              </span>
                            </TooltipTrigger>
                            {ctaDisabled && ctaTooltip && (
                              <TooltipContent>
                                <p>{ctaTooltip}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`w-full ${ctaDisabled ? 'cursor-not-allowed' : ''}`}>
                        <Button
                          variant="default"
                                  className={`flex w-full items-center gap-2 ${ctaDisabled ? 'cursor-not-allowed' : ''}`}
                          onClick={() => setOpen('true')}
                                  disabled={ctaDisabled}
                        >
                          <PlusIcon className="h-4 w-4" />
                          {cta}
                        </Button>
                              </span>
                            </TooltipTrigger>
                            {ctaDisabled && ctaTooltip && (
                              <TooltipContent>
                                <p>{ctaTooltip}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                      )}
                      </TooltipProvider>
                    </div>
                  )}
                </div>

                <div className="relative hidden flex-col items-center justify-center lg:flex">
                  <div className="bg-gradient-radial from-accent/20 absolute inset-0 rounded-full to-transparent opacity-70" />
                  <Image
                    src={theme === 'dark' ? imageSrcDark : imageSrcLight}
                    alt={imageAlt}
                    height={400}
                    width={400}
                    quality={100}
                    className="relative z-10 rounded-lg drop-shadow-md"
                    unoptimized
                  />
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </Card>
  );
}

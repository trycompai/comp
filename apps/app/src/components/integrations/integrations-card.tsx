import { deleteIntegrationConnectionAction } from '@/actions/integrations/delete-integration-connection';
import { retrieveIntegrationSessionTokenAction } from '@/actions/integrations/retrieve-integration-session-token';
import { updateIntegrationSettingsAction } from '@/actions/integrations/update-integration-settings-action';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent } from '@comp/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Globe,
  InfoIcon,
  Loader2,
  Settings,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
import { IntegrationSettings, type IntegrationSettingsItem } from './integration-settings';

export function IntegrationsCard({
  id,
  logo: Logo,
  name,
  short_description,
  description,
  guide_url,
  settings,
  images,
  active,
  installed,
  category,
  installedSettings,
  lastRunAt,
  nextRunAt,
}: {
  id: string;
  logo: React.ComponentType;
  name: string;
  short_description: string;
  description: string;
  guide_url?: string;
  settings: IntegrationSettingsItem[] | Record<string, any> | any;
  images: any[];
  active: boolean;
  installed: boolean;
  category: string;
  installedSettings: Record<string, any>;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
}) {
  const router = useRouter();

  // Add state to track if we're in edit mode for API key
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  // Start with empty component
  const [params, setParams] = useQueryStates({
    app: parseAsString,
    settings: parseAsBoolean,
  });

  const retrieveIntegrationSessionToken = useAction(retrieveIntegrationSessionTokenAction);

  const deleteIntegrationConnection = useAction(deleteIntegrationConnectionAction, {
    onSuccess: () => {
      toast.success('Integration disconnected successfully');
    },
    onError: () => {
      toast.error('Failed to disconnect integration');
    },
  });

  const updateIntegrationSettings = useAction(updateIntegrationSettingsAction, {
    onSuccess: () => {
      toast.success('Settings updated successfully');
      setIsEditingApiKey(false); // Exit edit mode on success
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const [isLoading, setLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setIsSaving(true);

      // Use the API key from the state
      const keyToUse = apiKeyInput.trim();
      if (!keyToUse) {
        toast.error('Please enter an API key');
        setLoading(false);
        setIsSaving(false);
        return;
      }

      // First save the API key if provided
      await updateIntegrationSettings.executeAsync({
        integration_id: id,
        option: { id: 'api_key', value: keyToUse },
      });

      // Show appropriate message based on whether we're updating or setting for first time
      if (isEditingApiKey) {
        toast.success('API key updated successfully');
      } else {
        toast.success('API key saved successfully');
      }

      // If not already installed (first time setup), then retrieve session token to complete connection
      if (!installed) {
        const res = await retrieveIntegrationSessionToken.executeAsync({
          integrationId: id,
        });
      }

      // Handle success
      setApiKeyInput('');
      setIsEditingApiKey(false);
      router.refresh();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect integration');
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  };

  // Function to get a friendly message about time to midnight UTC
  const getUTCMidnightMessage = (nextRunAt: Date): string => {
    if (!nextRunAt) return '';

    const now = new Date();
    const diffInMs = nextRunAt.getTime() - now.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffInHours <= 0 && diffInMinutes <= 0) {
      return 'Running soon';
    }

    if (diffInHours === 0) {
      return `Runs in ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    }

    if (diffInMinutes === 0) {
      return `Runs in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    }

    return `Runs in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''} and ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  };

  return (
    <Card key={id} className="flex w-full flex-col overflow-hidden">
      <Sheet open={params.app === id} onOpenChange={() => setParams(null)}>
        <CardHeader className="pb-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-sm p-2">
                <Logo />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle className="mb-0 flex items-center gap-2">
                  <p className="text-md leading-none font-medium">{name}</p>
                  {installed ? (
                    <Badge
                      variant="outline"
                      className="border-green-600 px-2 py-0 text-[10px] text-green-600"
                    >
                      Connected
                    </Badge>
                  ) : !active ? (
                    <Badge variant="outline" className="px-2 py-0 text-[10px]">
                      Coming Soon
                    </Badge>
                  ) : null}
                </CardTitle>
                <p className="text-muted-foreground text-xs">{category}</p>
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 relative h-1 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: installed ? '100%' : '0%' }}
            />
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          <p className="text-muted-foreground text-xs">{short_description}</p>
        </CardContent>

        <CardFooter className="flex justify-between border-t py-2">
          <Button
            variant={installed ? 'default' : 'ghost'}
            size="sm"
            className="w-full"
            disabled={!active}
            onClick={() => setParams({ app: id })}
          >
            {installed ? 'Manage' : 'Install'}
          </Button>
        </CardFooter>

        <SheetContent className="flex h-full flex-col p-0">
          <div className="border-b p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center p-2">
                  <Logo />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg leading-none font-medium">{name}</h3>
                    {installed && (
                      <Badge
                        variant="outline"
                        className="border-green-600 px-2 py-0 text-[10px] text-green-600"
                      >
                        Connected
                      </Badge>
                    )}
                  </div>

                  <span className="text-muted-foreground mt-1 text-xs">{category}</span>
                </div>
              </div>

              <div>
                {installed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      deleteIntegrationConnection.executeAsync({
                        integrationName: id,
                      });
                    }}
                  >
                    {deleteIntegrationConnection.status === 'executing'
                      ? 'Disconnecting...'
                      : 'Disconnect'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main content area with scroll */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-6">
              <Accordion
                type="multiple"
                defaultValue={['description', 'settings', 'sync-status']}
                className="mt-4 space-y-4"
              >
                {guide_url && (
                  <AccordionItem value="guide" className="border-0 border-b">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <InfoIcon className="mr-1 h-3.5 w-3.5" />
                        <span className="text-sm font-medium">How to get credentials</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 text-sm">
                      <Link
                        href={guide_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {guide_url}
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="description" className="border-0 border-b">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <InfoIcon className="mr-1 h-3.5 w-3.5" />
                      <span className="text-sm font-medium">Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 text-sm">
                    {description}
                  </AccordionContent>
                </AccordionItem>

                {installed && (
                  <AccordionItem value="sync-status" className="border-0 border-b">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        <span className="text-sm font-medium">Sync Status</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 text-sm">
                      <div className="space-y-4 border p-4">
                        <div className="flex items-start gap-2">
                          <Calendar className="text-muted-foreground mt-0.5 h-3.5 w-3.5" />
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-foreground text-sm font-medium">Last Sync</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Globe className="text-muted-foreground h-3 w-3 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Dates are shown in your local timezone</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {lastRunAt ? (
                              <p className="text-muted-foreground text-xs">
                                {format(new Date(lastRunAt), "PPP 'at' p")}
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (
                                  {formatDistanceToNow(new Date(lastRunAt), {
                                    addSuffix: true,
                                  })}
                                  )
                                </span>
                              </p>
                            ) : (
                              <p className="text-muted-foreground text-xs">Never run</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="text-muted-foreground mt-0.5 h-3.5 w-3.5" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-foreground text-sm font-medium">Next Sync</p>
                              <Badge variant="outline" className="h-4 text-[9px]">
                                UTC 00:00
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Globe className="text-muted-foreground h-3 w-3 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="start"
                                    className="max-w-[250px]"
                                  >
                                    <p>
                                      This integration runs at midnight UTC (00:00). Times are
                                      converted to your local timezone for display.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {nextRunAt ? (
                              <div className="space-y-0.5">
                                <p className="text-muted-foreground text-xs">
                                  {format(new Date(nextRunAt), "PPP 'at' p")}
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    (
                                    {formatDistanceToNow(new Date(nextRunAt), {
                                      addSuffix: true,
                                    })}
                                    )
                                  </span>
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                                  {getUTCMidnightMessage(nextRunAt)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">
                                {lastRunAt ? 'Calculating...' : 'Will run at the next midnight UTC'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-sm border p-3 text-xs">
                        <p>
                          This integration syncs automatically every day at midnight UTC (00:00).
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="settings" className="border-0 border-b">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      <span className="text-sm font-medium">Settings</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 text-sm">
                    {/* For Deel, always show the API key input */}
                    {id === 'deel' ? (
                      <div className="space-y-4">
                        {/* API Key status with checkmark if set */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {installedSettings?.api_key && (
                              <div className="text-green-600">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>

                          {/* Show update button when key is set and not in edit mode */}
                          {installedSettings?.api_key && !isEditingApiKey ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingApiKey(true)}
                            >
                              Update
                            </Button>
                          ) : null}
                        </div>

                        {/* Show input field either when:
													1. No API key is set yet, or
													2. User clicked the update button */}
                        {(!installedSettings?.api_key || isEditingApiKey) && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label
                                htmlFor={`${id}-api-key`}
                                className="text-sm leading-none font-medium"
                              >
                                {isEditingApiKey ? 'Update API Key' : 'Enter API Key'}
                              </label>
                              <Input
                                id={`${id}-api-key`}
                                type="password"
                                placeholder="Enter your Deel API key"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                              />
                              <p className="text-muted-foreground text-xs">
                                You can find your API key in your Deel account settings.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {isEditingApiKey && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setIsEditingApiKey(false)}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                type="button"
                                className="flex-1"
                                onClick={handleConnect}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : isEditingApiKey ? (
                                  'Update'
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : Array.isArray(settings) && settings.length > 0 ? (
                      <IntegrationSettings
                        integrationId={id}
                        settings={settings as IntegrationSettingsItem[]}
                        installedSettings={installedSettings}
                      />
                    ) : (
                      <div className="border p-4">
                        <p className="text-muted-foreground text-sm">No settings available</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Add extra space at the bottom to ensure content doesn't get cut off */}
              <div className="h-20" />
            </ScrollArea>
          </div>

          {/* Footer positioned at the bottom */}
          <div className="border-border bg-muted/30 mt-auto border-t p-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-[10px]">
                All integrations on the Comp AI store are open-source and peer-reviewed.
              </p>

              <a
                href="mailto:support@trycomp.ai"
                className="text-primary flex items-center gap-1 text-[10px] hover:underline"
              >
                <span>Report</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

import { deleteIntegrationConnectionAction } from "@/actions/integrations/delete-integration-connection";
import { retrieveIntegrationSessionTokenAction } from "@/actions/integrations/retrieve-integration-session-token";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@bubba/ui/accordion";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { ScrollArea } from "@bubba/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@bubba/ui/sheet";
import Nango from "@nangohq/frontend";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import {
  IntegrationSettings,
  type IntegrationSettingsItem,
} from "./integration-settings";

export function IntegrationsCard({
  id,
  logo: Logo,
  name,
  short_description,
  description,
  settings,
  images,
  active,
  installed,
  category,
  installedSettings,
}: {
  id: string;
  logo: React.ComponentType;
  name: string;
  short_description: string;
  description: string;
  settings: Record<string, any>;
  images: string[];
  active: boolean;
  installed: boolean;
  category: string;
  installedSettings: Record<string, any>;
}) {
  const nango = new Nango({
    width: 400,
    height: 600,
  });

  const router = useRouter();

  const [params, setParams] = useQueryStates({
    app: parseAsString,
    settings: parseAsBoolean,
  });

  const retrieveIntegrationSessionToken = useAction(
    retrieveIntegrationSessionTokenAction,
  );

  const deleteIntegrationConnection = useAction(
    deleteIntegrationConnectionAction,
    {
      onSuccess: () => {
        toast.success("Integration disconnected successfully");
      },
      onError: () => {
        toast.error("Failed to disconnect integration");
      },
    },
  );

  const [isLoading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);

      const res = await retrieveIntegrationSessionToken.executeAsync({
        integrationId: id,
      });

      const connect = nango.openConnectUI({
        onEvent: async (event) => {
          if (event.type === "close") {
            setLoading(false);
          } else if (event.type === "connect") {
            toast.success("Integration connected successfully");
            router.replace("/integrations");
          }
        },
      });

      if (res?.data?.sessionToken) {
        connect.setSessionToken(res.data.sessionToken);
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect integration");
      setLoading(false);
    }
  };

  return (
    <Card key={id} className="w-full flex flex-col">
      <Sheet open={params.app === id} onOpenChange={() => setParams(null)}>
        <div className="pt-6 px-6 h-16 flex items-center justify-between">
          <Logo />

          {installed && (
            <div className="text-green-600 bg-green-100 text-[10px] dark:bg-green-900 dark:text-green-300 px-3 py-1 rounded-none">
              Connected
            </div>
          )}
        </div>

        <CardHeader className="pb-0">
          <div className="flex items-center space-x-2 pb-4">
            <CardTitle className="text-md font-medium leading-none p-0 m-0">
              {name}
            </CardTitle>
            {!active && (
              <span className="text-muted-foreground text-[10px] px-3 py-1 font-mono">
                Coming soon
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="text-xs text-muted-foreground pb-4">
          {short_description}
        </CardContent>

        <div className="px-6 pb-6 flex gap-2 mt-auto">
          <Button
            variant="outline"
            className="w-full"
            disabled={!active}
            onClick={() => setParams({ app: id })}
          >
            Configure {name}
          </Button>
        </div>

        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center space-x-2">
                <Logo />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg leading-none">{name}</h3>
                    {installed && (
                      <div className="bg-green-600 text-[9px]  rounded-full size-1" />
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {category} • Published by Comp AI
                  </span>
                </div>
              </div>{" "}
              <div>
                {installed && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      deleteIntegrationConnection.executeAsync({
                        integrationId: id,
                      });
                    }}
                  >
                    {deleteIntegrationConnection.status === "executing"
                      ? "Disconnecting..."
                      : "Disconnect"}
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-530px)] pt-2" hideScrollbar>
            <Accordion
              type="multiple"
              defaultValue={["description", "settings"]}
              className="mt-4"
            >
              <AccordionItem value="description" className="border-none">
                <AccordionTrigger>How it works</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {description}
                </AccordionContent>
              </AccordionItem>

              {settings && settings.length > 0 && (
                <AccordionItem value="settings" className="border-none">
                  <AccordionTrigger>Settings</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    <IntegrationSettings
                      integrationId={id}
                      settings={settings as IntegrationSettingsItem[]}
                      installedSettings={installedSettings}
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </ScrollArea>

          <div className="absolute bottom-4 pt-8 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              All integrations on the Comp AI store are open-source and
              peer-reviewed.
            </p>

            <a
              href="mailto:support@trycomp.ai"
              className="text-[10px] text-red-500"
            >
              Report an issue
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Icons } from "@bubba/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@bubba/ui/popover";
import { ScrollArea } from "@bubba/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bubba/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

function EmptyState({ description }: { description: string }) {
  return (
    <div className="h-[460px] flex items-center justify-center flex-col space-y-4">
      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
        <Icons.Inbox className="size-16" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function NotificationItem({
  id,
  setOpen,
  description,
  createdAt,
  recordId,
  from,
  to,
  markMessageAsRead,
  type,
}: {
  id: string;
  setOpen: (open: boolean) => void;
  description: string | undefined;
  createdAt: string;
  recordId: string | undefined;
  from: string | undefined;
  to: string | undefined;
  markMessageAsRead: (id: string) => void;
  type: string | undefined;
}) {
  switch (type) {
    case "task":
      return (
        <div className="flex items-between justify-between space-x-4 px-3 py-3 hover:bg-secondary">
          <Link
            className="flex items-between justify-between space-x-4"
            onClick={() => setOpen(false)}
            href={`${recordId}`}
          >
            <div>
              <div className="h-9 w-9 flex items-center justify-center space-y-0 border rounded-full">
                <Icons.Risk />
              </div>
            </div>
            <div>
              <p className="text-sm">{description}</p>
              <span className="text-xs text-muted">
                {formatDistanceToNow(new Date(createdAt))} ago
              </span>
            </div>
          </Link>
          {markMessageAsRead && (
            <div>
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full bg-transparent hover:bg-[#1A1A1A]"
                onClick={() => markMessageAsRead(id)}
              >
                <Icons.Inventory2 />
              </Button>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

export function NotificationCenter() {
  const t = useI18n();

  const [isOpen, setOpen] = useState(false);
  const {
    hasUnseenNotifications,
    notifications,
    markMessageAsRead,
    markAllMessagesAsSeen,
    markAllMessagesAsRead,
  } = useNotifications();

  const unreadNotifications = notifications.filter(
    (notification) => !notification.read,
  );

  const archivedNotifications = notifications.filter(
    (notification) => notification.read,
  );

  useEffect(() => {
    if (isOpen && hasUnseenNotifications) {
      markAllMessagesAsSeen();
    }
  }, [hasUnseenNotifications, isOpen]);

  return (
    <Popover onOpenChange={setOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-8 h-8 flex items-center relative"
        >
          {hasUnseenNotifications && (
            <div className="w-1.5 h-1.5 bg-[#FFD02B] rounded-full absolute top-0 right-0" />
          )}
          <Icons.Notifications size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="h-[535px] w-screen md:w-[400px] p-0 overflow-hidden relative"
        align="end"
        sideOffset={10}
      >
        <Tabs defaultValue="inbox">
          <TabsList className="w-full justify-start bg-transparent border-b-[1px] rounded-none py-6">
            <TabsTrigger value="inbox" className="font-normal">
              {t("common.notifications.inbox")}
            </TabsTrigger>
            <TabsTrigger value="archive" className="font-normal">
              {t("common.notifications.archive")}
            </TabsTrigger>
          </TabsList>

          <Link
            href="/settings/notifications"
            className="absolute right-[11px] top-1.5"
          >
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-transparent hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Icons.Settings className="text-muted" size={16} />
            </Button>
          </Link>

          <TabsContent value="inbox" className="relative mt-0">
            {!unreadNotifications.length && (
              <EmptyState description="No new notifications" />
            )}

            {unreadNotifications.length > 0 && (
              <ScrollArea className="pb-12 h-[485px]">
                <div className="divide-y">
                  {unreadNotifications.map((notification) => {
                    return (
                      <NotificationItem
                        key={notification.id}
                        id={notification.id}
                        markMessageAsRead={markMessageAsRead}
                        setOpen={setOpen}
                        description={notification.payload.description}
                        createdAt={notification.createdAt}
                        recordId={notification.payload.recordId}
                        type={notification.payload.type}
                        from={notification.payload?.from}
                        to={notification.payload?.to}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {unreadNotifications.length > 0 && (
              <div className="h-12 w-full absolute bottom-0 flex items-center justify-center border-t-[1px]">
                <Button
                  variant="secondary"
                  className="bg-transparent"
                  onClick={markAllMessagesAsRead}
                >
                  {t("common.notifications.archive_all")}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-0">
            {!archivedNotifications.length && (
              <EmptyState
                description={t("common.notifications.no_notifications")}
              />
            )}

            {archivedNotifications.length > 0 && (
              <ScrollArea className="h-[490px]">
                <div className="divide-y">
                  {archivedNotifications.map((notification) => {
                    return (
                      <NotificationItem
                        key={notification.id}
                        id={notification.id}
                        setOpen={setOpen}
                        description={notification.payload.description}
                        createdAt={notification.createdAt}
                        recordId={notification.payload.recordId}
                        type={notification.payload.type}
                        from={notification.payload?.from}
                        to={notification.payload?.to}
                        markMessageAsRead={markMessageAsRead}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

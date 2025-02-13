import { UserMenu } from "@/components/user-menu";
import { getI18n } from "@/locales/server";
import { Button } from "@bubba/ui/button";
import { Icons } from "@bubba/ui/icons";
import { Skeleton } from "@bubba/ui/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { FeedbackForm } from "./feedback-form";
import { MobileMenu } from "./mobile-menu";
import { NotificationCenter } from "./notification-center";

export async function Header() {
  const t = await getI18n();

  return (
    <header className="-ml-4 -mr-4 md:m-0 z-10 px-4 md:px-0 md:border-b-[1px] flex justify-between pt-4 pb-2 md:pb-4 items-center todesktop:sticky todesktop:top-0 todesktop:bg-background todesktop:border-none sticky md:static top-0 backdrop-filter backdrop-blur-xl md:backdrop-filter md:backdrop-blur-none bg-opacity-70">
      <MobileMenu />

      <div className="flex space-x-2 ml-auto">
        <div className="hidden md:flex gap-2">
          <FeedbackForm />
          <Button
            asChild
            variant="outline"
            className="rounded-full font-normal h-[32px] p-0 px-3 text-xs text-muted-foreground gap-2 items-center"
          >
            <Link
              href="https://discord.gg/compai"
              target="_blank"
              className="flex gap-2"
            >
              <Icons.Discord className="h-4 w-4" />
              {t("header.discord.button")}
            </Link>
          </Button>
        </div>

        <NotificationCenter />

        <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

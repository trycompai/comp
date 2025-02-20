import { getI18n } from "@/app/locales/server";
import { Avatar, AvatarFallback, AvatarImageNext } from "@bubba/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bubba/ui/dropdown-menu";
import { headers } from "next/headers";
import { auth } from "../lib/auth";
import { LocaleSwitch } from "./locale-switch";
import { Logout } from "./logout";
import { ThemeSwitch } from "./theme-switch";

export async function UserMenu() {
  const t = await getI18n();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="rounded-full w-8 h-8 cursor-pointer">
          {session?.user?.image && (
            <AvatarImageNext
              src={session?.user?.image}
              alt={session?.user?.name ?? ""}
              width={32}
              height={32}
              quality={100}
            />
          )}
          <AvatarFallback>
            <span className="text-xs">
              {session?.user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        {" "}
        <DropdownMenuLabel>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="truncate line-clamp-1 max-w-[155px] block">
                {session?.user?.name}
              </span>
              <span className="truncate text-xs text-muted-foreground font-normal">
                {session?.user?.email}
              </span>
            </div>
            <div className="border py-0.5 px-3 rounded-full text-[11px] font-normal">
              Beta
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-row justify-between items-center p-2">
          <p className="text-sm">{t("user_menu.theme")}</p>
          <ThemeSwitch />
        </div>{" "}
        <DropdownMenuSeparator />{" "}
        <div className="flex flex-row justify-between items-center p-2">
          <p className="text-sm">{t("user_menu.language")}</p>
          <LocaleSwitch />
        </div>{" "}
        <DropdownMenuSeparator />
        <Logout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

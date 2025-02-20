import { Icons } from "@bubba/ui/icons";
import { cookies } from "next/headers";
import Link from "next/link";
import { MainMenu } from "./main-menu";

export async function Sidebar() {
  return (
    <aside className="h-screen flex-shrink-0 flex-col justify-between fixed top-0 ml-4 pb-4 items-center hidden md:flex">
      <div className="flex flex-col items-center justify-center">
        <div className="mt-2 todesktop:mt-[35px]">
          <div className="mt-2 items-center justify-center">
            <Link href="/">
              <Icons.Logo />
            </Link>
          </div>
        </div>
        <MainMenu />
      </div>
    </aside>
  );
}

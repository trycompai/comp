"use client";

import Link from "next/link";
import LogoHeader from "./logo-header";

export function MainNav() {
  return (
    <div className="flex mt-8">
      <Link href="/" aria-label="Comp AI Home" className="flex items-center gap-2">
        <LogoHeader className="w-48" />
      </Link>
    </div>
  );
}

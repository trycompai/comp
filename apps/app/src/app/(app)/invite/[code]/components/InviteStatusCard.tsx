"use client";

import Link from "next/link";

import { Button } from "@trycompai/ui/button";
import { Icons } from "@trycompai/ui/icons";

export function InviteStatusCard({
  title,
  description,
  primaryHref,
  primaryLabel,
  children,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card relative w-full max-w-[480px] rounded-sm border p-10 shadow-lg">
      <div className="flex flex-col items-center gap-6 text-center">
        <Icons.Logo />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mx-auto max-w-[48ch] text-base leading-relaxed">
          {description}
        </p>
        {children}
        {primaryHref && primaryLabel && (
          <Link href={primaryHref} className="w-full">
            <Button className="w-full" size="sm">
              {primaryLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Button } from "@bubba/ui/button";
import { useI18n } from "@/locales/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTablePaginationProps {
  pageCount: number;
  currentPage: number;
}

export function DataTablePagination({
  pageCount,
  currentPage,
}: DataTablePaginationProps) {
  const t = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (currentPage > 1) {
            router.push(createPageURL(currentPage - 1));
          }
        }}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        {t("common.pagination.previous", {})}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (currentPage < pageCount) {
            router.push(createPageURL(currentPage + 1));
          }
        }}
        disabled={currentPage >= pageCount}
      >
        {t("common.pagination.next", {})}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

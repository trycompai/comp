"use client";

import { Button } from "@bubba/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface DataTablePaginationProps {
  pageCount: number;
  currentPage: number;
}

export function DataTablePagination({
  pageCount,
  currentPage,
}: DataTablePaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const createPageQuery = useCallback(
    (value: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", value.toString());
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const createPerPageQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("per_page", value);
      params.set("page", "1"); // Reset to first page when changing items per page
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <Select
          value={searchParams.get("per_page") || "10"}
          onValueChange={createPerPageQuery}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => createPageQuery(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex w-[60px] items-center justify-center text-sm font-medium">
          {currentPage} of {pageCount}
        </div>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => createPageQuery(currentPage + 1)}
          disabled={currentPage >= pageCount}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

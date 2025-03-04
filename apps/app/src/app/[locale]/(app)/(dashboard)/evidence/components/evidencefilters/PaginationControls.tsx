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
import { useEvidenceTable } from "../../hooks/useEvidenceTableContext";

export function PaginationControls() {
  const { page, setPage, pageSize, setPageSize, pagination } =
    useEvidenceTable();

  if (!pagination) return null;

  const { totalPages, totalCount } = pagination;
  const currentPage = Number.parseInt(page, 10);

  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    setPage("1"); // Reset to first page when changing page size
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? "item" : "items"}
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((currentPage - 1).toString())}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{currentPage}</span>
            <span className="text-sm text-muted-foreground">
              of {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((currentPage + 1).toString())}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

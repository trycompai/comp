"use client";

import { useI18n } from "@/locales/client";

import { Button } from "@bubba/ui/button";
import { TableHead, TableHeader, TableRow } from "@bubba/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
  table?: {
    getIsAllPageRowsSelected: () => boolean;
    getIsSomePageRowsSelected: () => boolean;
    getAllLeafColumns: () => {
      id: string;
      getIsVisible: () => boolean;
    }[];
    toggleAllPageRowsSelected: (value: boolean) => void;
  };
  loading?: boolean;
  isEmpty?: boolean;
};

export function DataTableHeader({ table, loading }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const t = useI18n();

  const sortParam = searchParams.get("sort");
  const [column, value] = sortParam ? sortParam.split(":") : [];

  const createSortQuery = useCallback(
    (name: string) => {
      const params = new URLSearchParams(searchParams);
      const prevSort = params.get("sort");

      if (`${name}:asc` === prevSort) {
        params.set("sort", `${name}:desc`);
      } else if (`${name}:desc` === prevSort) {
        params.delete("sort");
      } else {
        params.set("sort", `${name}:asc`);
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const isVisible = (id: string) =>
    loading ||
    table
      ?.getAllLeafColumns()
      .find((col) => col.id === id)
      ?.getIsVisible();

  return (
    <TableHeader>
      <TableRow className="h-[45px] hover:bg-transparent">
        {isVisible("email") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("email")}
            >
              <span>{t("people.table.email")}</span>
            </Button>
          </TableHead>
        )}
        {isVisible("name") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("name")}
            >
              <span>{t("people.table.name")}</span>
              {"name" === column && value === "asc" && <ArrowDown size={16} />}
              {"name" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("department") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("department")}
            >
              <span>{t("people.table.department")}</span>
              {"department" === column && value === "asc" && (
                <ArrowDown size={16} />
              )}
              {"department" === column && value === "desc" && (
                <ArrowUp size={16} />
              )}
            </Button>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}

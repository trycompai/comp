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
        {isVisible("severity") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("severity")}
            >
              <span>{t("tests.table.severity")}</span>
              {"severity" === column && value === "asc" && <ArrowDown size={16} />}
              {"severity" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("result") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("result")}
            >
              <span>{t("tests.table.result")}</span>
              {"result" === column && value === "asc" && <ArrowDown size={16} />}
              {"result" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("title") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("title")}
            >
              <span>{t("tests.table.title")}</span>
              {"title" === column && value === "asc" && <ArrowDown size={16} />}
              {"title" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("provider") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("provider")}
            >
              <span>{t("tests.table.provider")}</span>
              {"provider" === column && value === "asc" && <ArrowDown size={16} />}
              {"provider" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("createdAt") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("createdAt")}
            >
              <span>{t("tests.table.createdAt")}</span>
              {"createdAt" === column && value === "asc" && <ArrowDown size={16} />}
              {"createdAt" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible("assignedUser") && (
          <TableHead className="min-w-[120px] px-3 md:px-4 py-2">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("assignedUser")}
            >
              <span>{t("tests.table.assignedUser")}</span>
              {"assignedUser" === column && value === "asc" && <ArrowDown size={16} />}
              {"assignedUser" === column && value === "desc" && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}

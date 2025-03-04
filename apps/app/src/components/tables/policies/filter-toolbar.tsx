"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { cn } from "@bubba/ui/cn";
import { Input } from "@bubba/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { Skeleton } from "@bubba/ui/skeleton";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { useTransition } from "react";
import { useCallback, useState, useEffect } from "react";
import type { User } from "next-auth";

interface FilterToolbarProps {
  isEmpty?: boolean;
  users: User[];
}

export function FilterToolbar({ isEmpty = false, users }: FilterToolbarProps) {
  const t = useI18n();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState<string>("");

  const [search, setSearch] = useQueryState("search", {
    shallow: false,
    history: "push",
    parse: (value) => value || null,
  });

  const [status, setStatus] = useQueryState("status", {
    shallow: false,
    history: "push",
    parse: (value) => value || null,
  });

  const [ownerId, setOwnerId] = useQueryState("ownerId", {
    shallow: false,
    history: "push",
    parse: (value) => value || null,
  });

  const [sort, setSort] = useQueryState("sort", {
    shallow: false,
    history: "push",
    parse: (value) => value || null,
  });

  // Initialize searchInput with the current search value
  useEffect(() => {
    setSearchInput(search || "");
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (search || "")) {
        setSearch(searchInput || null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, search, setSearch]);

  const handleReset = useCallback(() => {
    startTransition(() => {
      setSearch(null);
      setStatus(null);
      setOwnerId(null);
      setSort(null);
      setSearchInput("");
    });
  }, [setSearch, setStatus, setOwnerId, setSort]);

  const hasFilters = search || status || ownerId || sort;

  const handleStatusChange = (value: string) => {
    setStatus(value === "all" ? null : value);
  };

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4 opacity-20 pointer-events-none blur-[7px]">
        <div className="relative flex-1 md:max-w-sm">
          <Skeleton className={cn("h-10", isEmpty && "animate-none")} />
        </div>

        <div className="md:flex gap-2 md:flex-row md:items-center hidden">
          <Skeleton
            className={cn("h-10 w-[200px]", isEmpty && "animate-none")}
          />
          <Skeleton
            className={cn("h-10 w-[200px]", isEmpty && "animate-none")}
          />
          <Skeleton
            className={cn("h-9 w-[120px]", isEmpty && "animate-none")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-between gap-2 mb-4">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("policies.search_placeholder")}
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="md:hidden">
          <Link href="/policies/new">
            <Button variant="action">
              <Plus className="h-4 w-4" />
              {t("policies.create_new")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Select value={status || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-auto min-w-[100px]">
            <SelectValue placeholder={t("policies.status_filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("policies.all_statuses")}</SelectItem>
            <SelectItem value="draft">{t("common.status.draft")}</SelectItem>
            <SelectItem value="published">
              {t("common.status.published")}
            </SelectItem>
            <SelectItem value="needs_review">
              {t("common.status.needs_review")}
            </SelectItem>
            <SelectItem value="archived">
              {t("common.status.archived")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={ownerId || ""}
          onValueChange={(value) => setOwnerId(value || null)}
        >
          <SelectTrigger className="w-[200px] min-w-[200px]">
            <SelectValue placeholder={t("common.filters.owner.label")} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user?.id || ""}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            {t("common.actions.clear")}
          </Button>
        )}

        <Link href="/policies/new">
          <Button variant="action">
            <Plus className="h-4 w-4" />
            {t("policies.create_new")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

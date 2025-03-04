"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Input } from "@bubba/ui/input";
import { Plus, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";
import Link from "next/link";

interface FilterToolbarProps {
  isEmpty?: boolean;
}

export function FilterToolbar({ isEmpty }: FilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useI18n();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(
    searchParams?.get("search") ?? "",
  );

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      }

      return newSearchParams.toString();
    },
    [searchParams],
  );

  const [debouncedValue] = useDebounce(inputValue, 300);

  useEffect(() => {
    startTransition(() => {
      router.push(
        `${pathname}?${createQueryString({
          search: debouncedValue || null,
          page: null,
        })}`,
      );
    });
  }, [debouncedValue, createQueryString, pathname, router]);

  return (
    <div className="flex flex-row items-center justify-between gap-2 mb-4">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("tests.filters.search")}
            className="pl-8"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <div className="md:hidden">
          {<Button asChild variant="action">
            <Link href="/integrations">
              {t("tests.actions.refresh")}
            </Link>
          </Button>}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInputValue("");
              router.push(pathname);
            }}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            {t("common.actions.clear")}
          </Button>
        )}
{
        <Button asChild variant="action">
          <Link href="/integrations">
            {t("tests.actions.refresh")}
          </Link>
        </Button> }
      </div>
    </div>
  );
}

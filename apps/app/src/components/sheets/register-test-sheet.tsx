"use client";

import { useEmployees } from "@/app/[locale]/(app)/(dashboard)/people/hooks/useEmployees";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Input } from "@bubba/ui/input";
import { Label } from "@bubba/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@bubba/ui/sheet";
import type { Departments } from "@prisma/client";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

const DEPARTMENTS: Departments[] = [
  "none",
  "admin",
  "gov",
  "hr",
  "it",
  "itsm",
  "qms",
];


export function RegisterTestSheet() {
  const t = useI18n();
  const [open, setOpen] = useQueryState("register-test-sheet");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<Departments>("none");
  const [name, setName] = useState("");
  const { addEmployee, isMutating } = useEmployees();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addEmployee({
        name,
        email: email.trim(),
        department,
      });

      toast.success(t("tests.register.success"));
      setOpen(null);
    } catch (error) {
      toast.error(t("errors.unexpected"));
    }
  };

  return (
    <Sheet
      open={open === "true"}
      onOpenChange={(open) => setOpen(open ? "true" : null)}
    >
      <SheetContent>
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("tests.register.title")}</SheetTitle>
            <SheetDescription>
              {t("tests.register.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("tests.register.name.label")}</Label>
              <Input
                id="name"
                placeholder={t("tests.register.name.placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">{t("tests.register.email.label")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("tests.register.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">
                {t("tests.register.department.label")}
              </Label>
              <Select
                value={department}
                onValueChange={(value) => setDepartment(value as Departments)}
              >
                <SelectTrigger id="department">
                  <SelectValue
                    placeholder={t("tests.register.department.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button
              type="submit"
              disabled={isMutating || !email.trim()}
              isLoading={isMutating}
            >
              {isMutating
                ? t("tests.register.submit")
                : t("tests.register.submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

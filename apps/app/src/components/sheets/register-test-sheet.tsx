"use client";

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
import { Textarea } from "@bubba/ui/textarea";
import type { CloudProvider } from "@prisma/client";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

const PROVIDERS: CloudProvider[] = ["AWS", "AZURE", "GCP"];

export function RegisterTestSheet() {
  const t = useI18n();
  const [open, setOpen] = useQueryState("register-test-sheet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<CloudProvider>("AWS");
  const [config, setConfig] = useState("{}");
  const [authConfig, setAuthConfig] = useState("{}");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate JSON inputs
      const configJson = JSON.parse(config);
      const authConfigJson = JSON.parse(authConfig);

      // TODO: Add your createTest mutation here
      // await createTest({
      //   title,
      //   description,
      //   provider,
      //   config: configJson,
      //   authConfig: authConfigJson,
      // });

      toast.success(t("tests.register.success"));
      setOpen(null);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error(t("tests.register.invalid_json"));
      } else {
        toast.error(t("errors.unexpected"));
      }
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
              <Label htmlFor="title">{t("tests.register.title_field.label")}</Label>
              <Input
                id="title"
                placeholder={t("tests.register.title_field.placeholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("tests.register.description_field.label")}</Label>
              <Textarea
                id="description"
                placeholder={t("tests.register.description_field.placeholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider">
                {t("tests.register.provider.label")}
              </Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as CloudProvider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue
                    placeholder={t("tests.register.provider.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="config">{t("tests.register.config.label")}</Label>
              <Textarea
                id="config"
                placeholder={t("tests.register.config.placeholder")}
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authConfig">{t("tests.register.auth_config.label")}</Label>
              <Textarea
                id="authConfig"
                placeholder={t("tests.register.auth_config.placeholder")}
                value={authConfig}
                onChange={(e) => setAuthConfig(e.target.value)}
                required
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              type="submit"
              disabled={!title.trim() || !config.trim() || !authConfig.trim()}
            >
              {t("tests.register.submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

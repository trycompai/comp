import { getI18n } from "@/app/locales/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getI18n();

  return (
    <div className="text-muted-foreground flex h-screen flex-col items-center justify-center text-center text-sm">
      <h2 className="mb-2 text-xl font-semibold">{t("not_found.title")}</h2>
      <p className="mb-4">{t("not_found.description")}</p>
      <Link href="/" className="underline">
        {t("not_found.return")}
      </Link>
    </div>
  );
}

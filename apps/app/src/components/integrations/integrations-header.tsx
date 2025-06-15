import { SearchField } from "../search-field";
import { AppsTabs } from "./integrations-tabs";

export function IntegrationsHeader() {
  return (
    <div className="flex w-full space-x-4">
      <AppsTabs />
      <SearchField placeholder="Search integrations" shallow />
    </div>
  );
}

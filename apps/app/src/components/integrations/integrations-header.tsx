import { SearchField } from "../search-field";
import { AppsTabs } from "./integrations-tabs";

export function IntegrationsHeader() {
	return (
		<div className="flex space-x-4 w-full">
			<AppsTabs />
			<SearchField placeholder="Search integrations" shallow />
		</div>
	);
}

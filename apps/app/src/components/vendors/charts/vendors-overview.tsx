import { VendorsByCategory } from "./vendors-by-category";
import { VendorsByStatus } from "./vendors-by-status";

interface VendorOverviewProps {
	organizationId: string;
}

export function VendorOverview({ organizationId }: VendorOverviewProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full col-span-full">
			<div className="w-full h-full">
				<VendorsByStatus organizationId={organizationId} />
			</div>
			<div className="w-full h-full">
				<VendorsByCategory organizationId={organizationId} />
			</div>
		</div>
	);
}

"use client";

import { useParams } from "next/navigation";
import React from "react";
import Link from "next/link";
import { Button } from "@comp/ui/button";
import { ArrowLeft } from "lucide-react";

// --- Wizard Component Imports (Example - Replace with actual imports) ---
// Assume you have components like this:
// import { Soc2ConfigWizard } from '@/components/wizards/Soc2ConfigWizard';
// import { OtherWizard } from '@/components/wizards/OtherWizard';

// Simple placeholder components for demonstration
const Soc2ConfigWizard = () => <div>SOC 2 Configuration Wizard Content</div>;
const OtherWizard = () => <div>Another Wizard Content</div>;
// ----------------------------------------------------------------------

// Map wizardId strings to actual Wizard components
const wizardMap: Record<string, React.ComponentType> = {
	"soc2-config-wizard": Soc2ConfigWizard,
	"other-wizard": OtherWizard,
	// Add mappings for all your wizard IDs
};

export default function WizardPage() {
	const { locale, orgId, wizardId } = useParams<{
		locale: string;
		orgId: string;
		wizardId: string;
	}>();

	// Construct the path back home
	const homePath = `/${locale}/${orgId}/home`;

	const WizardComponent = wizardMap[wizardId];

	if (!WizardComponent) {
		return <div>Wizard not found for ID: {wizardId}</div>;
	}

	return (
		<div className="container mx-auto py-8">
			{/* Back to Home Link/Button */}
			<Button variant="outline" size="sm" asChild className="mb-6">
				<Link href={homePath} className="flex items-center">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Home
				</Link>
			</Button>

			<WizardComponent />
		</div>
	);
}

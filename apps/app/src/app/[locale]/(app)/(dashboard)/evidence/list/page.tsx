import { EvidenceList } from "../components/EvidenceList";
import { EvidenceTableProvider } from "../hooks/useEvidenceTableContext";

export default function EvidencePage() {
	return (
		<EvidenceTableProvider>
			<EvidenceList />
		</EvidenceTableProvider>
	);
}

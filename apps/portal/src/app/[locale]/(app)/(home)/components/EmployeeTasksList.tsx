"use client";

import type {
	Policy,
	EmployeeTrainingVideoCompletion,
	Member,
} from "@comp/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@comp/ui/tabs";
import { PolicyList } from "./policy";
import { VideoCarousel } from "./video";

interface EmployeeTasksListProps {
	policies: Policy[];
	trainingVideos: EmployeeTrainingVideoCompletion[];
	member: Member | null;
}

export const EmployeeTasksList = ({
	policies,
	trainingVideos,
	member,
}: EmployeeTasksListProps) => {
	return (
		<Tabs defaultValue="policies">
			<TabsList className="bg-transparent border-b-[1px] w-full justify-start rounded-none mb-1 p-0 h-auto pb-4">
				<TabsTrigger value="policies">Policies</TabsTrigger>
				<TabsTrigger value="training">Training</TabsTrigger>
			</TabsList>
			<TabsContent value="policies" className="py-2">
				<PolicyList policies={policies} member={member} />
			</TabsContent>
			<TabsContent value="training" className="py-2">
				<VideoCarousel videos={trainingVideos} />
			</TabsContent>
		</Tabs>
	);
};

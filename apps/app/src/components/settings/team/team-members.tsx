import { MembersTable } from "@/components/tables/members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bubba/ui/tabs";
import { Suspense } from "react";

export function TeamMembers() {
  return (
    <Tabs defaultValue="members">
      <TabsList className="bg-transparent border-b-[1px] w-full justify-start rounded-none mb-1 p-0 h-auto pb-4">
        <TabsTrigger value="members" className="p-0 m-0 mr-4">
          Team Members
        </TabsTrigger>
        <TabsTrigger value="pending" className="p-0 m-0">
          Pending Invitations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members">
        <MembersTable />
      </TabsContent>

      <TabsContent value="pending">Test 2</TabsContent>
    </Tabs>
  );
}

import { LogoSpinner } from "@/components/logo-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@comp/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@comp/ui/tabs";

export default async function Loading() {
  return (
    <div className="space-y-4 sm:space-y-8">
      <Tabs defaultValue="members">
        <TabsList className="mb-1 h-auto w-full justify-start rounded-sm border-b-[1px] bg-transparent p-0 pb-4">
          <TabsTrigger value="members" className="m-0 mr-4 p-0">
            {"Members"}
          </TabsTrigger>
          <TabsTrigger value="invite" className="m-0 p-0">
            {"Invite"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>{"Team Members"}</CardTitle>
              <CardDescription />
            </CardHeader>
            <CardContent>
              <LogoSpinner />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="blur-xs">
                <CardTitle>{"Invite Members"}</CardTitle>
                <CardDescription>
                  {"Invite new members to join your organization."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LogoSpinner />
              </CardContent>
              <div className="flex justify-end p-4">
                <div className="bg-muted h-10 w-24 rounded-sm blur-xs" />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

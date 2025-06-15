import { LogoSpinner } from "@/components/logo-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";

export default async function Loading() {
  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{"Policy by Status"}</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[300px] items-center justify-center">
            <LogoSpinner />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Policies by Assignee"}</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[300px] items-center justify-center">
            <LogoSpinner />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { LogoSpinner } from "@/components/logo-spinner";
import { Button } from "@comp/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@comp/ui/card";
import { Plus } from "lucide-react";

export default async function Loading() {
  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{"API Keys"}</CardTitle>
            <CardDescription>
              {
                "API keys allow secure access to your organization's data via our API."
              }
            </CardDescription>
          </div>
          <Button
            className="flex items-center gap-1 self-start sm:self-auto"
            disabled
            aria-label={"New API Key"}
          >
            <Plus className="h-4 w-4" />
            {"New API Key"}
          </Button>
        </CardHeader>
        <CardContent>
          <LogoSpinner />
        </CardContent>
        <CardFooter className="text-muted-foreground text-sm">
          {
            "API keys provide full access to your organization's data. Keep them secure and rotate them regularly."
          }
        </CardFooter>
      </Card>
    </div>
  );
}

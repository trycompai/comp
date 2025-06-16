import { AlertDialog, AlertDialogTrigger } from "@comp/ui/alert-dialog";
import { Button } from "@comp/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@comp/ui/card";
import { Input } from "@comp/ui/input";

export default async function Loading() {
  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>{"Organization name"}</CardTitle>
          <CardDescription>
            {
              "This is your organizations visible name. You should use the legal name of your organization."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Loading..."
            className="max-w-[300px]"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>{"Please use 32 characters at maximum."}</div>
          <Button disabled aria-label={"Save"}>
            {"Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"Organization Website"}</CardTitle>
          <CardDescription>
            {
              "This is your organization's official website. Include https:// in the URL."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="url"
            placeholder="Loading..."
            className="max-w-[300px]"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>{"Please enter a valid URL including https://"}</div>
          <Button disabled aria-label={"Save"}>
            {"Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive border-2">
        <CardHeader>
          <CardTitle>{"Delete organization"}</CardTitle>
          <CardDescription>
            {
              "Permanently remove your organization and all of its contents from the Comp AI platform. This action is not reversible - please continue with caution."
            }
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between">
          <div />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled aria-label={"Delete"}>
                {"Delete"}
              </Button>
            </AlertDialogTrigger>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}

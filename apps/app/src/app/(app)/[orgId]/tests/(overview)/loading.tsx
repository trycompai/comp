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
    <div className="grid grid-cols-1 gap-4 space-y-12 md:grid-cols-2">
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
    </div>
  );
}

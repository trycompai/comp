import { Button } from "@comp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import type { Host } from "../types";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@comp/ui/cn";

export const HostDetails = ({
  host,
  onClose,
}: {
  host: Host;
  onClose: () => void;
}) => {
  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-min" onClick={onClose}>
        <ArrowLeft size={16} className="mr-2" />
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{host.computer_name}'s Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {host.policies.length > 0 ? (
            host.policies.map((policy) => (
              <div
                key={policy.id}
                className={cn(
                  "hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors",
                  policy.response === "pass"
                    ? "border-l-green-500"
                    : "border-l-red-500",
                )}
              >
                <p className="font-medium">{policy.name}</p>
                {policy.response === "pass" ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={16} />
                    <span>Pass</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle size={16} />
                    <span>Fail</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">
              No policies found for this device.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

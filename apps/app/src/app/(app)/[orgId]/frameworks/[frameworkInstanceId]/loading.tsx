import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Skeleton } from "@comp/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comp/ui/table";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Framework Overview Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Framework Info Card */}
        <Card className="h-[176px] w-[389px]">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-36" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-4/5" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>

        {/* Compliance Progress Card */}
        <Card className="h-[176px] w-[389px]">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Assessment Status Card */}
        <Card className="h-[176px] w-[389px]">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Framework Controls Table Skeleton */}
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-[53px]">
              {["code", "name", "status"].map((column) => (
                <TableHead key={`header-${column}`} className="h-[53px]">
                  <Skeleton className="h-5 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              "control1",
              "control2",
              "control3",
              "control4",
              "control5",
              "control6",
              "control7",
              "control8",
              "control9",
              "control10",
              "control11",
              "control12",
              "control13",
              "control14",
              "control15",
              "control16",
              "control17",
              "control18",
            ].map((control) => (
              <TableRow key={`row-${control}`} className="h-[57px]">
                {["code", "name", "status"].map((column) => (
                  <TableCell
                    key={`cell-${control}-${column}`}
                    className="h-[53px] px-3 py-2 md:px-4"
                  >
                    <Skeleton
                      className={`h-4 w-${column === "name" ? "30" : column === "code" ? "32" : "30"}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

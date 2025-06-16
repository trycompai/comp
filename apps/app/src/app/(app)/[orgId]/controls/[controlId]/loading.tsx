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
    <div className="mx-auto max-w-[1200px]">
      <div className="space-y-8">
        {/* Control Info Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Control Details Card */}
          <Card className="h-[138px] w-[590px]">
            <CardHeader>
              <CardTitle className="flex justify-between md:flex-row">
                <Skeleton className="h-5 w-1/5" />
                <Skeleton className="h-5 w-1/5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-full" />
            </CardContent>
          </Card>

          {/* Domain Card */}
          <Card className="h-[138px] w-[590px]">
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-16" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>

        {/* Requirements Table */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-[44px]">
                    <TableHead key="header-type" className="w-[91px]">
                      <Skeleton className="h-5 w-24" />
                    </TableHead>
                    <TableHead key="header-description">
                      <Skeleton className="h-5 w-24" />
                    </TableHead>
                    <TableHead key="header-status" className="w-[91px]">
                      <Skeleton className="h-5 w-24" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["type", "description", "status"].map((requirementType) => (
                    <TableRow
                      key={`row-${requirementType}`}
                      className="h-[73px]"
                    >
                      <TableCell
                        key={`cell-${requirementType}-type`}
                        className="w-[91px]"
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell
                        key={`cell-${requirementType}-description`}
                        className="p-4"
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell
                        key={`cell-${requirementType}-status`}
                        className="w-[91px]"
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

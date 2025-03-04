import { Skeleton } from "@bubba/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@bubba/ui/table";

const SKELETON_ROWS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
] as const;

export const SkeletonTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Skeleton className="h-4 w-[200px]" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-4 w-[100px]" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-4 w-[150px]" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {SKELETON_ROWS.map((key) => (
          <TableRow key={key} className="h-[54px]">
            <TableCell>
              <Skeleton className="h-4 w-[200px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[150px]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

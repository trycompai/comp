import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";

interface ComplianceSectionProps {
  title: string;
  children: ReactNode;
  isLive?: boolean;
}

export default function ComplianceSection({
  title,
  children,
  isLive = false,
}: ComplianceSectionProps) {
  return (
    <Card>
      <CardHeader className="border-t-muted-foreground border-b- rounded-t-sm border-t-4 border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-4">{children}</CardContent>
    </Card>
  );
}

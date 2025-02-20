import type { User } from "@/app/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";

export default function EmployeePortal({
  user,
}: {
  user: User | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user?.organization} Training Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Welcome to the employee portal, {user?.name}.</p>
        <p>You are a member of {user?.organization}.</p>
      </CardContent>
    </Card>
  );
}

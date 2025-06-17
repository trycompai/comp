import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';

interface Risk {
  id: string;
  title: string;
  description: string;
  owner: {
    name: string;
  };
}

interface RiskDisplayProps {
  risks: Risk[];
}

export function RiskDisplay({ risks }: RiskDisplayProps) {
  if (!risks?.length) {
    return (
      <div className="text-muted-foreground text-sm">No risks found for this organization.</div>
    );
  }

  return (
    <div className="grid gap-4">
      {risks.map((risk) => (
        <Card key={risk.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{risk.title}</span>
              <Badge variant="secondary">{risk.owner.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{risk.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

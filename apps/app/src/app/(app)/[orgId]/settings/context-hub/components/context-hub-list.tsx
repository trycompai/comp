import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { Context } from '@db';

export async function ContextHubList({ entries }: { entries: Context[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Context</CardTitle>
        <CardDescription>
          You can add context to the Comp AI platform to help it better understand your
          organization/processes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-2 rounded-sm border p-4">
            <h3 className="font-medium">{entry.question}</h3>
            <p className="text-muted-foreground text-sm">{entry.answer}</p>
            <div className="flex gap-2">
              {entry.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="rounded-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

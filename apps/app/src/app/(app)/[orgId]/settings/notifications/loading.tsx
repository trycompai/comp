import {
  Section,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';

export default function NotificationsLoading() {
  return (
    <Section
      title="Role Notification Settings"
      description="Configure which email notifications each role receives."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton style={{ height: '1rem', width: '4rem' }} />
            </TableHead>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TableHead key={i}>
                <div className="flex justify-center">
                  <Skeleton style={{ height: '1rem', width: '5rem' }} />
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton style={{ height: '1rem', width: '6rem' }} />
              </TableCell>
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <TableCell key={j}>
                  <div className="flex justify-center">
                    <Skeleton style={{ height: '1rem', width: '1rem' }} />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

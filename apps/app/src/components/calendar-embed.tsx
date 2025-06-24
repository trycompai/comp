'use client';

import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

export default function CalendarEmbed() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: 'meet-us' });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, []);

  return (
    <Cal namespace="meet-us" calLink="team/compai/meet-us" config={{ layout: 'month_view' }} />
  );
}

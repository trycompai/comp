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
    <Cal
      namespace="meet-us"
      calLink="team/compai/meet-us"
      style={{ width: '100%', height: '100%', overflow: 'scroll' }}
      config={{ layout: 'month_view' }}
    />
  );
}

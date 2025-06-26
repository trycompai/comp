'use client';

import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

export default function CalendarEmbed() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: 'comp-ai-demo' });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, []);

  return (
    <Cal
      namespace="comp-ai-demo"
      calLink="team/compai/comp-ai-demo"
      config={{ layout: 'month_view', theme: 'auto' }}
    />
  );
}

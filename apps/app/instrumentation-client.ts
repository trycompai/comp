import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/chat', method: 'POST' },
    {
      path: `${process.env.NEXT_PUBLIC_ENTERPRISE_API_URL}/api/tasks-automations/chat`,
      method: 'POST',
    },
    {
      path: `${process.env.NEXT_PUBLIC_ENTERPRISE_API_URL}/api/tasks-automations/errors`,
      method: 'POST',
    },
  ],
});

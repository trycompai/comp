import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    {
      path: '/api/tasks-automations/chat',
      method: 'POST',
    },
  ],
});

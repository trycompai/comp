import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/chat', method: 'POST' },
    { path: '/api/tasks-automations/chat', method: 'POST' },
    { path: '/api/tasks-automations/errors', method: 'POST' },
  ],
});

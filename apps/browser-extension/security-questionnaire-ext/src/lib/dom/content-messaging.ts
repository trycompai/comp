import { isConfirmationResponse } from '../response-guards';
import { confirmDomainInContent } from './content-dialog';
import { sendRuntimeMessage } from './safe-runtime';

export async function sendWithDomainConfirmation(message: {
  type: 'comp:generate-queue-item' | 'comp:generate-all' | 'comp:insert-queue-item';
  tabId: number;
  itemId?: string;
}): Promise<unknown> {
  const response = await sendRuntimeMessage(message);
  if (response === null) return extensionReloadedResponse();
  if (!isConfirmationResponse(response)) return response;

  const confirmed = await confirmDomainInContent(response.confirmation);
  if (!confirmed) {
    return { ok: false, error: 'Workspace confirmation cancelled.' };
  }

  await sendRuntimeMessage({
    type: 'comp:confirm-domain',
    host: response.confirmation.host,
    organizationId: response.confirmation.organizationId,
  });
  const retry = await sendRuntimeMessage(message);
  return retry ?? extensionReloadedResponse();
}

function extensionReloadedResponse(): { ok: false; error: string } {
  return {
    ok: false,
    error: 'Extension was reloaded. Refresh this page and try again.',
  };
}

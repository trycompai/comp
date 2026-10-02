import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, realtime, toastError } = vi.hoisted(() => ({
  post: vi.fn(),
  realtime: vi.fn(() => ({ run: undefined })),
  toastError: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({ api: { post } }));
vi.mock('@trigger.dev/react-hooks', () => ({ useRealtimeRun: realtime }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

import { useQuestionnaireParse } from './useQuestionnaireParse';

describe('questionnaire parsing through the authenticated API', () => {
  const input = {
    organizationId: 'org_aaaaaaaaaaaaaaaaaaaaaaaa',
    fileName: 'questionnaire.pdf',
    fileType: 'application/pdf',
    fileData: 'encoded-file',
  };
  const props = {
    orgId: input.organizationId,
    setQuestionnaireId: vi.fn(),
    setIsParseProcessStarted: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('does not request a browser task token when mounted', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderHook(() => useQuestionnaireParse(props));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('starts an authorized upload and observes only its returned run', async () => {
    post.mockResolvedValue({
      data: { runId: 'authorized-run', publicAccessToken: 'run-read-token' },
    });
    const { result } = renderHook(() => useQuestionnaireParse(props));
    await act(async () => result.current.uploadFileAction.execute(input));

    expect(post).toHaveBeenCalledWith('/v1/questionnaire/upload-and-parse', {
      ...input,
      source: 'internal',
    });
    await waitFor(() =>
      expect(realtime).toHaveBeenCalledWith('authorized-run', {
        accessToken: 'run-read-token',
        enabled: true,
      }),
    );
  });

  it('does not start run observation when the API denies permission', async () => {
    post.mockResolvedValue({ error: 'Access denied', status: 403 });
    const { result } = renderHook(() => useQuestionnaireParse(props));
    await act(async () => result.current.uploadFileAction.execute(input));

    expect(toastError).toHaveBeenCalledWith('Access denied');
    expect(props.setIsParseProcessStarted).toHaveBeenCalledWith(false);
    expect(realtime).toHaveBeenLastCalledWith('', { accessToken: undefined, enabled: false });
  });
});

import { EvidenceAutomationRun } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAutomationRuns() {
  const { automationId } = useParams<{
    automationId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR<{ runs: EvidenceAutomationRun[] }>(
    `/api/automations/${automationId}/runs`,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds
      revalidateOnFocus: true,
    },
  );

  return {
    runs: data?.runs,
    isLoading,
    isError: !!error,
    mutate,
  };
}

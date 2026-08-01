'use client';

import { createContext, useEffect, useRef, useState } from 'react';

export const TriggerAuthContext = createContext({
  accessToken: undefined,
  baseURL: undefined,
});

async function fetchRun(runId, accessToken, baseURL, signal) {
  const params = new URLSearchParams();
  if (accessToken) params.set('accessToken', accessToken);
  const base = baseURL || '';
  const res = await fetch(
    `${base}/api/trigger/runs/${encodeURIComponent(runId)}?${params.toString()}`,
    { signal, headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

function useRunBase(runId, opts) {
  const options = opts || {};
  const { accessToken, enabled = true, refreshInterval = 1000, baseURL } =
    options;
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(runId));

  const accessTokenRef = useRef(accessToken);
  const runIdRef = useRef(runId);
  const baseURLRef = useRef(baseURL);
  accessTokenRef.current = accessToken;
  runIdRef.current = runId;
  baseURLRef.current = baseURL;

  useEffect(() => {
    if (!runId || enabled === false) {
      setRun(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    async function tick() {
      if (!active) return;
      try {
        const data = await fetchRun(
          runIdRef.current,
          accessTokenRef.current,
          baseURLRef.current,
          controller.signal,
        );
        if (!active) return;
        setRun(data);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err);
          setIsLoading(false);
        }
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), refreshInterval);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [runId, accessToken, enabled, refreshInterval, baseURL]);

  return { run, error, isLoading };
}

export function useRun(runId, opts) {
  return useRunBase(runId, opts);
}

export function useRealtimeRun(runId, opts) {
  return useRunBase(runId, opts);
}

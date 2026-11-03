import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = [], options: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, deps);

  useEffect(() => {
    if (!options.pollMs) return;
    const id = setInterval(() => load('silent'), options.pollMs);
    return () => clearInterval(id);
  }, [options.pollMs, load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  return { data, error, loading, refreshing, refresh };
}

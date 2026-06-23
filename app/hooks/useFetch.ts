import { useCallback, useEffect, useRef, useState } from "react";

type UseFetchOptions = RequestInit & {
  /** 不自動立即發 request（需要手動呼叫 fetch/refetch） */
  immediate?: boolean;
};

/**
 * 通用的 useFetch hook
 * - 支援 AbortController
 * - 回傳 { data, error, loading, refetch, cancel, fetch }
 */
export default function useFetch<T = any>(
  url?: string,
  options?: UseFetchOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (overrideUrl?: string, overrideOptions?: RequestInit) => {
      const finalUrl = overrideUrl ?? url;
      if (!finalUrl) return null;

      // 取消上一次請求
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(finalUrl, {
          signal: controller.signal,
          ...(options ?? {}),
          ...(overrideOptions ?? {}),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText || `HTTP ${res.status}`);
        }

        const ct = res.headers.get("content-type") || "";
        const payload = ct.includes("application/json") ? await res.json() : await res.text();
        setData(payload as T);
        return payload as T;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // aborted
          return null;
        }
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, JSON.stringify(options ?? {})]
  );

  useEffect(() => {
    if (options?.immediate === false) return;
    if (!url) return;
    fetchData();
    return () => controllerRef.current?.abort();
  }, [url, fetchData, options?.immediate]);

  const refetch = useCallback(() => fetchData(), [fetchData]);
  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { data, error, loading, refetch, cancel, fetch: fetchData } as const;
}

import { useEffect, useState } from "react";
import { api } from "./api";
export function useRead<T>(path: string, version: number, retainDuringRefresh = false): {key: string; data?: T; error?: string} | null {
  const [result, setResult] = useState<{
    key: string;
    path: string;
    data?: T;
    error?: string;
  } | null>(null);
  const key = path + ":" + version;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (active) setResult({ key, path, data });
      })
      .catch((e) => {
        if (active) setResult({ key, path, error: e.message });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, key]);
  return result?.key === key || (retainDuringRefresh && result?.path === path) ? result : null;
}

// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export function useApiData(path, { skip = false, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(
    async (quiet = false) => {
      if (skip || !path) return;
      if (!quiet) setLoading(true);
      setError("");
      try {
        const result = await api(path);
        if (mounted.current) setData(result);
      } catch (err) {
        if (mounted.current) setError(errorMessage(err));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [path, skip]
  );

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip, ...deps]);

  return { data, loading, error, reload, setData };
}

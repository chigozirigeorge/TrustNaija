// ============================================================
// hooks/useLookup.ts — Custom hook for identifier lookup
// ============================================================

import { useState, useCallback } from 'react';
import { lookup as lookupApi } from '@/lib/api';
import type { LookupResult } from '@/types';

interface UseLookupReturn {
  result: LookupResult | null;
  loading: boolean;
  error: string | null;
  lookup: (identifier: string) => Promise<void>;
  clear: () => void;
}

export function useLookup(): UseLookupReturn {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const data = await lookupApi(trimmed);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, lookup, clear };
}

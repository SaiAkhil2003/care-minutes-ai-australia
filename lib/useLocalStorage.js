'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * useState but persisted to localStorage.
 * Always initialises with initialValue (matches SSR), then loads from
 * localStorage in an effect so hydration never mismatches.
 *
 * @param {string} key        - localStorage key
 * @param {*}      initialValue
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const didMount = useRef(false);

  // After first render: read the real stored value (no SSR mismatch)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored));
    } catch {}
    didMount.current = true;
  }, [key]);

  // Persist changes, but skip the very first run to avoid overwriting
  // localStorage with the default before the read effect above has fired.
  useEffect(() => {
    if (!didMount.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, [key, value]);

  return [value, setValue];
}

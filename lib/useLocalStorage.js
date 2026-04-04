'use client';

import { useState, useEffect } from 'react';

/**
 * useState but persisted to localStorage.
 * Falls back to initialValue if nothing is stored yet or if SSR.
 *
 * @param {string} key        - localStorage key
 * @param {*}      initialValue
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, [key, value]);

  return [value, setValue];
}

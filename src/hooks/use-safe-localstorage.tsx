'use client'

import { useState } from 'react';

export const useSafeLocalStorage = (key: string, initialValue: string) => {
  const [storedValue, setStoredValue] = useState(() => {
    // if (typeof window === 'undefined') return initialValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : JSON.parse(initialValue);
  });

  const setValue = (value: string) => {
    setStoredValue(JSON.parse(value));
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  return [storedValue, setValue];
};

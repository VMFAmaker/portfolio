
"use client";

import { useState, useEffect } from 'react';

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // You can return a placeholder like '...' or an empty fragment
    // depending on whether you want to show something during loading.
    return null; 
  }

  return <>{year}</>;
}

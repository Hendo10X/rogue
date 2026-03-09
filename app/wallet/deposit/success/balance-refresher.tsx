"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function BalanceRefresher() {
  const router = useRouter();

  useEffect(() => {
    const intervals = [5000, 10000, 20000, 30000];
    const timers = intervals.map((ms) =>
      setTimeout(() => router.refresh(), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [router]);

  return null;
}

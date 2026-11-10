"use client";

import { useSyncExternalStore } from "react";
import { safeNext } from "@/lib/safe-next";

const noSubscribe = () => () => {};

/** The page's safe `?next=` (see lib/safe-next.ts). Null while rendering on the server, so pages stay static. */
export function useNextParam(): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => safeNext(new URLSearchParams(window.location.search).get("next")),
    () => null,
  );
}

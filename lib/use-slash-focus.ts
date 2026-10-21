"use client";

import { useEffect, useRef } from "react";

/**
 * "/" focuses (and selects) the returned input from anywhere on the page,
 * unless the user is already typing in a field.
 */
export function useSlashFocus<T extends HTMLInputElement = HTMLInputElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return ref;
}

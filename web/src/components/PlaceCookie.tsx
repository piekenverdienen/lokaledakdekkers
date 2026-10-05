"use client";
import { useEffect } from "react";
export default function PlaceCookie({ name }: { name: string }) {
  useEffect(() => { try { document.cookie = `ld_place=${encodeURIComponent(name)}; max-age=2592000; path=/; samesite=lax`; } catch { /* niets */ } }, [name]);
  return null;
}

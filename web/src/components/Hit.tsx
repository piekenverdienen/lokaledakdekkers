"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function Hit() {
  const path = usePathname();
  useEffect(() => { try { const body = JSON.stringify({ p: path }); if (navigator.sendBeacon) navigator.sendBeacon("/api/hit/", new Blob([body], { type: "application/json" })); else fetch("/api/hit/", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }); } catch { /* niets */ } }, [path]);
  return null;
}

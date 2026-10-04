"use client";
import { useEffect, useRef } from "react";

export type Marker = { lat: number; lng: number; label: string; href?: string; pro?: boolean; size?: number };

declare global {
  interface Window { L?: any }
}

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-leaflet]");
    if (existing) { existing.addEventListener("load", () => resolve(window.L)); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true; s.dataset.leaflet = "1";
    s.onload = () => resolve(window.L); s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function Map({ center, zoom = 11, markers, tall = false, fit = true }: { center: [number, number]; zoom?: number; markers: Marker[]; tall?: boolean; fit?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: any;
    loadLeaflet().then((L) => {
      if (!ref.current || ref.current.dataset.init) return;
      ref.current.dataset.init = "1";
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
      }).addTo(map);
      const group: any[] = [];
      for (const m of markers) {
        const r = m.size ?? (m.pro ? 10 : 7);
        const c = L.circleMarker([m.lat, m.lng], { radius: r, color: "#fff", weight: 2, fillColor: m.pro ? "#C97A0F" : "#0B5C8F", fillOpacity: 1 }).addTo(map);
        c.bindPopup(m.href ? `<a href="${m.href}"><b>${m.label}</b></a>` : `<b>${m.label}</b>`);
        group.push(c);
      }
      if (fit && group.length > 1) map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
    }).catch(() => {});
    return () => { if (map) map.remove(); };
  }, []);
  return <div ref={ref} className={`map${tall ? " tall" : ""}`} role="img" aria-label="Kaart" />;
}

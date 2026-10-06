"use client";
import { useEffect, useRef } from "react";

export type Marker = { lat: number; lng: number; label: string; href?: string; pro?: boolean; size?: number; count?: number };

declare global {
  interface Window { L?: any }
}

function loadScript(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-${key}]`);
    if (existing) { if (existing.dataset.loaded) resolve(); else existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true; s.dataset[key] = "1";
    s.onload = () => { s.dataset.loaded = "1"; resolve(); }; s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function loadLeaflet(cluster: boolean): Promise<any> {
  if (typeof window === "undefined") throw new Error("ssr");
  if (!window.L) await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet");
  if (cluster && !window.L.markerClusterGroup) {
    for (const href of ["https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"]) {
      if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
    }
    await loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "cluster");
  }
  return window.L;
}

export default function Map({ center, zoom = 11, markers, tall = false, fit = true, cluster = false }: { center: [number, number]; zoom?: number; markers: Marker[]; tall?: boolean; fit?: boolean; cluster?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: any;
    loadLeaflet(cluster).then((L) => {
      if (!ref.current || ref.current.dataset.init) return;
      ref.current.dataset.init = "1";
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
      }).addTo(map);
      const group: any[] = [];
      const layer = cluster ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 56, iconCreateFunction: (c: any) => { const kids = c.getAllChildMarkers(); const sum = kids.reduce((a: number, k: any) => a + (k.options.lkCount ?? 1), 0); return L.divIcon({ html: `<div class="lk-cluster">${sum}</div>`, className: "", iconSize: [44, 44] }); } }) : null;
      for (const m of markers) {
        let mk: any;
        if (m.count != null) {
          const size = Math.max(30, Math.min(52, 22 + Math.sqrt(m.count) * 2));
          mk = L.marker([m.lat, m.lng], { lkCount: m.count, icon: L.divIcon({ html: `<div class="lk-count" style="width:${size}px;height:${size}px;line-height:${size}px">${m.count}</div>`, className: "", iconSize: [size, size] }) });
        } else {
          mk = L.circleMarker([m.lat, m.lng], { radius: m.size ?? (m.pro ? 10 : 8), color: "#fff", weight: 2, fillColor: m.pro ? "#9A452B" : "#176E96", fillOpacity: 1 });
        }
        mk.bindPopup(m.href ? `<a href="${m.href}"><b>${m.label}</b></a>` : `<b>${m.label}</b>`);
        if (layer) layer.addLayer(mk); else mk.addTo(map);
        group.push(mk);
      }
      if (layer) map.addLayer(layer);
      if (fit && group.length > 1) map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
    }).catch(() => {});
    return () => { if (map) map.remove(); };
  }, []);
  return <div ref={ref} className={`map${tall ? " tall" : ""}`} role="img" aria-label="Kaart" />;
}

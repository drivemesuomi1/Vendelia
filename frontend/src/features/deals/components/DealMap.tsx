"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, TileLayer } from "leaflet";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import type { MapPoint } from "../geocode";

type View = "map" | "satellite";

const LAYERS: Record<View, { url: string; attribution: string; maxZoom: number }> = {
  map: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
};

// The site's pin icon, drawn as the marker so it matches the brand (and needs no image files).
const PIN_HTML = `<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
  <path d="M12 22s-7.5-6.6-7.5-12.2A7.5 7.5 0 0 1 19.5 9.8C19.5 15.4 12 22 12 22z" fill="#3B32B3" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="9.8" r="2.8" fill="#fff"/></svg>`;

/** Interactive OpenStreetMap map of a deal's address, with a map/satellite switch and full screen. */
export function DealMap({ point, address }: { point: MapPoint; address: string }) {
  const { t } = useI18n();
  const frame = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const tiles = useRef<TileLayer | null>(null);
  const [view, setView] = useState<View>("map");
  // iPhone and iPad open Apple Maps; everything else opens Google Maps. Decided after mount so the
  // server render (Google) and the first client render match.
  const google = `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}`;
  const [mapsUrl, setMapsUrl] = useState(google);
  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
    setMapsUrl(ios ? `https://maps.apple.com/?ll=${point.lat},${point.lon}&q=${encodeURIComponent(address)}` : google);
  }, [google, point.lat, point.lon, address]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || map.current) return;
      const m = L.map(holder.current, {
        center: [point.lat, point.lon], zoom: 16, zoomControl: false,
        // Page scrolling stays page scrolling; zoom with the buttons, pinch or ctrl/double-click.
        scrollWheelZoom: false,
      });
      L.control.zoom({ position: "bottomright" }).addTo(m);
      m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.marker([point.lat, point.lon], {
        icon: L.divIcon({ html: PIN_HTML, className: "deal-map-pin", iconSize: [38, 38], iconAnchor: [19, 36] }),
        title: address, keyboard: false,
      }).addTo(m);
      map.current = m;
      tiles.current = L.tileLayer(LAYERS.map.url, LAYERS.map).addTo(m);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      tiles.current = null;
    };
  }, [point.lat, point.lon, address]);

  useEffect(() => {
    const layer = tiles.current;
    if (!layer) return;
    layer.setUrl(LAYERS[view].url);
    layer.options.attribution = LAYERS[view].attribution;
    map.current?.attributionControl.removeAttribution(LAYERS[view === "map" ? "satellite" : "map"].attribution);
    map.current?.attributionControl.addAttribution(LAYERS[view].attribution);
  }, [view]);

  // Leaflet must re-measure when the frame changes size (entering or leaving full screen).
  useEffect(() => {
    const resize = () => map.current?.invalidateSize();
    document.addEventListener("fullscreenchange", resize);
    return () => document.removeEventListener("fullscreenchange", resize);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.();
  };

  return (
    <div className="deal-map" ref={frame}>
      <div ref={holder} className="deal-map-canvas" role="img" aria-label={t("deal.mapOf", { address })} />
      <div className="deal-map-views" role="group" aria-label={t("deal.mapView")}>
        {(["map", "satellite"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {t(v === "map" ? "deal.mapViewMap" : "deal.mapViewSatellite")}
          </button>
        ))}
      </div>
      <button type="button" className="deal-map-full" onClick={toggleFullscreen} aria-label={t("deal.mapFullscreen")} title={t("deal.mapFullscreen")}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      <a className="deal-map-open" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        <Icon name="pin" />{t("deal.mapOpen")}
      </a>
    </div>
  );
}

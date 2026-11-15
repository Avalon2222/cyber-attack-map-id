"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibre, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import type { HostID, Kategori, Snapshot } from "@/lib/jenis";
import { KATEGORI } from "@/lib/jenis";
import { WARNA } from "@/lib/warna";
import { bangunStyle } from "@/lib/gayaPeta";
import { workerPetaSekali } from "@/lib/workerPeta";
import { KanvasSerangan } from "@/lib/kanvas/animasi";
import type { Busur } from "@/lib/serangan";

interface Props {
  snapshot: Snapshot | null;
  filter: Set<Kategori>;
  jeda: boolean;
  datar: boolean;
  /** naikkan angkanya untuk terbang balik ke tampilan awal */
  resetSinyal: number;
  onPing: (h: HostID) => void;
  onBusur: (b: Busur) => void;
  onPilih: (h: HostID | null) => void;
  onGagal: () => void;
}

export function tampilanAwal(lebar: number): { center: [number, number]; zoom: number } {
  if (lebar < 640) return { center: [112, -1], zoom: 1.35 };
  if (lebar < 1100) return { center: [108, 2], zoom: 1.8 };
  return { center: [100, 6], zoom: 2.15 };
}

function geojsonHost(host: HostID[], filter: Set<Kategori>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: host
      .filter((h) => filter.has(h.kategori))
      .map((h) => ({
        type: "Feature",
        id: h.id,
        properties: { id: h.id, kategori: h.kategori, jumlah: h.jumlah },
        geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      })),
  };
}

const WARNA_EKSPRESI = ["match", ["get", "kategori"], ...KATEGORI.flatMap((k) => [k, WARNA[k]]), "#ffffff"] as unknown as string;

export default function Peta({ snapshot, filter, jeda, datar, resetSinyal, onPing, onBusur, onPilih, onGagal }: Props) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const kanvasRef = useRef<KanvasSerangan | null>(null);
  const [siap, setSiap] = useState(false);
  // penangan terbaru dibaca lewat ref supaya event peta gak perlu dipasang ulang
  const penangan = useRef({ onPing, onBusur, onPilih, onGagal, snapshot });
  useEffect(() => {
    penangan.current = { onPing, onBusur, onPilih, onGagal, snapshot };
  });

  useEffect(() => {
    if (!wadahRef.current || mapRef.current) return;
    let batal = false;
    (async () => {
      const [style, urlWorker] = await Promise.all([bangunStyle().catch(() => null), workerPetaSekali()]);
      if (batal || !wadahRef.current) return;
      if (!style) {
        penangan.current.onGagal();
        return;
      }
      setWorkerUrl(urlWorker);
      const awal = tampilanAwal(wadahRef.current.clientWidth);
      let m: MapLibre;
      try {
        m = new MapLibre({
          container: wadahRef.current,
          style,
          center: awal.center,
          zoom: awal.zoom,
          minZoom: 0.8,
          maxZoom: 9,
          attributionControl: { compact: true },
          fadeDuration: 150,
        });
      } catch {
        penangan.current.onGagal();
        return;
      }
      mapRef.current = m;
      (window as unknown as { __peta?: MapLibre }).__peta = m;
      m.on("load", () => {
        m.addSource("host", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "host-halo",
          type: "circle",
          source: "host",
          paint: {
            "circle-color": WARNA_EKSPRESI,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, ["+", 5, ["*", 2, ["ln", ["get", "jumlah"]]]], 7, ["+", 14, ["*", 4, ["ln", ["get", "jumlah"]]]]],
            "circle-blur": 1,
            "circle-opacity": 0.35,
          },
        });
        m.addLayer({
          id: "host-titik",
          type: "circle",
          source: "host",
          paint: {
            "circle-color": WARNA_EKSPRESI,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 1.8, 7, ["+", 4, ["ln", ["get", "jumlah"]]]],
            "circle-stroke-color": "#02050b",
            "circle-stroke-width": 0.6,
          },
        });
        m.on("click", "host-titik", (e) => {
          const id = e.features?.[0]?.properties?.id;
          const h = penangan.current.snapshot?.host.find((x) => x.id === id) ?? null;
          penangan.current.onPilih(h);
        });
        m.on("click", (e) => {
          const kena = m.queryRenderedFeatures(
            [
              [e.point.x - 10, e.point.y - 10],
              [e.point.x + 10, e.point.y + 10],
            ],
            { layers: ["host-titik"] },
          );
          if (!kena.length) penangan.current.onPilih(null);
        });
        m.on("mouseenter", "host-titik", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "host-titik", () => (m.getCanvas().style.cursor = ""));

        if (wadahRef.current?.parentElement) {
          const k = new KanvasSerangan(m, wadahRef.current.parentElement);
          k.onPing = (h) => penangan.current.onPing(h);
          k.onBusur = (b) => penangan.current.onBusur(b);
          kanvasRef.current = k;
          (window as unknown as { __kanvas?: KanvasSerangan }).__kanvas = k;
        }
        setSiap(true);
      });
    })();
    return () => {
      batal = true;
      kanvasRef.current?.hancurkan();
      kanvasRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // data + filter
  useEffect(() => {
    const m = mapRef.current;
    const k = kanvasRef.current;
    if (!siap || !m || !snapshot) return;
    (m.getSource("host") as GeoJSONSource | undefined)?.setData(geojsonHost(snapshot.host, filter));
    if (k) {
      k.aliran = snapshot.masuk.aliran;
      k.host = snapshot.host;
      k.filter = filter;
    }
  }, [siap, snapshot, filter]);

  useEffect(() => {
    if (kanvasRef.current) kanvasRef.current.jeda = jeda;
  }, [jeda, siap]);

  useEffect(() => {
    const m = mapRef.current;
    if (!siap || !m) return;
    m.setProjection({ type: datar ? "mercator" : "globe" });
  }, [datar, siap]);

  useEffect(() => {
    const m = mapRef.current;
    if (!siap || !m || resetSinyal === 0) return;
    const awal = tampilanAwal(m.getContainer().clientWidth);
    m.flyTo({ ...awal, bearing: 0, pitch: 0, duration: 1400 });
  }, [resetSinyal, siap]);

  // pembungkus absolut: CSS MapLibre memaksa .maplibregl-map jadi position: relative
  return (
    <div className="absolute inset-0">
      <div ref={wadahRef} className="h-full w-full" data-testid="peta" />
    </div>
  );
}

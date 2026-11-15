/**
 * Basemap vektor gelap OpenFreeMap (gratis, tanpa kunci) yang diwarnai ulang ala layar SOC:
 * laut hampir hitam, daratan biru gelap, garis batas negara cyan redup, label seperlunya.
 */

import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

export const URL_STYLE = "https://tiles.openfreemap.org/styles/dark";

const SEMBUNYI =
  /^(building|aeroway|road_|highway_|railway|landuse_|landcover_wood|landcover_ice|landcover_glacier|place_other|place_suburb|place_village|place_town|place_state|water_name|waterway|boundary_state)/;

export function ubahStyle(dasar: StyleSpecification): StyleSpecification {
  const layers: LayerSpecification[] = [];
  for (const l of dasar.layers) {
    if (SEMBUNYI.test(l.id)) continue;
    if (l.id === "background" && l.type === "background") {
      layers.push({ ...l, paint: { "background-color": "#0c1a2e" } });
    } else if (l.id === "water" && l.type === "fill") {
      layers.push({ ...l, paint: { "fill-color": "#02050b" } });
    } else if (/^boundary_country/.test(l.id) && l.type === "line") {
      layers.push({ ...l, paint: { ...l.paint, "line-color": "#1f6f8b", "line-opacity": 0.55, "line-width": 0.8 } });
    } else if (/^place_(country|city)/.test(l.id) && l.type === "symbol") {
      layers.push({
        ...l,
        paint: { ...l.paint, "text-color": l.id.startsWith("place_country") ? "#5d7a99" : "#4a5f78", "text-halo-color": "#02050b", "text-halo-width": 1.2 },
      } as LayerSpecification);
    } else layers.push(l);
  }
  return {
    ...dasar,
    layers,
    projection: { type: "globe" },
    sky: {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
      "sky-color": "#03070f",
      "horizon-color": "#0c3a52",
      "fog-color": "#02050b",
      "fog-ground-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "sky-horizon-blend": 0.9,
    },
  } as StyleSpecification;
}

export async function bangunStyle(): Promise<StyleSpecification> {
  const res = await fetch(URL_STYLE);
  if (!res.ok) throw new Error(`style ${res.status}`);
  return ubahStyle((await res.json()) as StyleSpecification);
}

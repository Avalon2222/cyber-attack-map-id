import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KATEGORI } from "@/lib/jenis";
import { LABEL_KATEGORI, labelKategori, t, type KunciTeks } from "@/lib/i18n";
import { pilihTerbaru, snapshotValid } from "@/lib/muat";
import { bendera, namaNegara, SENTROID } from "@/lib/negara";
import { kebijakanKonten } from "@/lib/keamanan";
import { angka, jamWib, relatif } from "@/lib/waktu";
import { WARNA, rgba } from "@/lib/warna";
import { ANGKA_BSSN } from "@/lib/bssn";
import { ubahStyle } from "@/lib/gayaPeta";

describe("i18n", () => {
  it("tiap teks punya versi ID dan EN", () => {
    const src = readFileSync("src/lib/i18n.ts", "utf8");
    const kunci = [...src.matchAll(/^ {2}([a-z0-9_]+): \{/gm)].map((m) => m[1] as KunciTeks).filter((k) => !(k in LABEL_KATEGORI));
    expect(kunci.length).toBeGreaterThan(30);
    for (const k of kunci) {
      expect(t(k, "id").length, k).toBeGreaterThan(0);
      expect(t(k, "en").length, k).toBeGreaterThan(0);
    }
  });
  it("semua kategori punya label dan warna", () => {
    for (const k of KATEGORI) {
      expect(labelKategori(k, "id")).toBeTruthy();
      expect(labelKategori(k, "en")).toBeTruthy();
      expect(WARNA[k]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("negara", () => {
  it("sentroid, nama, bendera", () => {
    expect(SENTROID.ID[0]).toBeGreaterThan(100);
    expect(Object.keys(SENTROID).length).toBeGreaterThan(200);
    expect(namaNegara("ID", "en")).toBe("Indonesia");
    expect(namaNegara("US", "id")).toMatch(/Amerika/);
    expect(namaNegara("rusak")).toBe("rusak");
    expect(bendera("ID")).toBe("🇮🇩");
    expect(bendera("x")).toBe("🏳️");
  });
});

describe("muat snapshot", () => {
  const ok = { versi: 1, dibuat: "2026-11-15T00:00:00Z", sumber: [], host: [], tren: [], masuk: { aliran: [] } };
  it("validasi", () => {
    expect(snapshotValid(ok)).toBe(true);
    expect(snapshotValid({ ...ok, versi: 2 })).toBe(false);
    expect(snapshotValid({ ...ok, dibuat: "x" })).toBe(false);
    expect(snapshotValid(null)).toBe(false);
  });
  it("pilih yang paling baru dan valid", () => {
    const baru = { ...ok, dibuat: "2026-11-15T03:00:00Z" };
    expect(pilihTerbaru([ok, baru, { rusak: 1 }])).toBe(baru);
    expect(pilihTerbaru([null, null])).toBeNull();
  });
});

describe("keamanan", () => {
  it("CSP mengizinkan ubin peta + cabang data, tanpa unsafe-eval di produksi", () => {
    const csp = kebijakanKonten(false);
    expect(csp).toContain("https://tiles.openfreemap.org");
    expect(csp).toContain("https://raw.githubusercontent.com");
    expect(csp).not.toContain("unsafe-eval");
    expect(kebijakanKonten(true)).toContain("unsafe-eval");
  });
});

describe("waktu & warna", () => {
  it("format", () => {
    expect(jamWib(new Date("2026-11-15T01:02:03Z"))).toBe("08:02:03");
    expect(relatif("2026-11-15T00:00:00Z", Date.parse("2026-11-15T03:00:00Z"), "en")).toBe("3 hours ago");
    expect(relatif(undefined, 0, "id")).toBe("–");
    expect(angka(1304, "id")).toBe("1.304");
    expect(rgba("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
  });
});

describe("BSSN", () => {
  it("tiap angka punya sumber https", () => {
    for (const a of ANGKA_BSSN) {
      expect(a.sumber).toMatch(/^https:\/\//);
      expect(a.anomali).toBeGreaterThan(1e6);
    }
  });
});

describe("gaya peta", () => {
  it("menyembunyikan jalan/bangunan, memakai proyeksi globe", () => {
    const s = ubahStyle({
      version: 8,
      sources: {},
      layers: [
        { id: "background", type: "background" },
        { id: "water", type: "fill", source: "x" },
        { id: "building", type: "fill", source: "x" },
        { id: "highway_minor", type: "line", source: "x" },
        { id: "place_country_major", type: "symbol", source: "x" },
      ],
    } as never);
    expect(s.layers.map((l) => l.id)).toEqual(["background", "water", "place_country_major"]);
    expect(s.projection).toEqual({ type: "globe" });
  });
});

describe("snapshot bawaan di repo", () => {
  const s = JSON.parse(readFileSync("public/data/ancaman.json", "utf8"));
  it("valid dan gak memuat IP lengkap", () => {
    expect(snapshotValid(s)).toBe(true);
    expect(JSON.stringify(s)).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    for (const h of s.host) expect(h.ip).toMatch(/^\d{1,3}\.\d{1,3}\.x\.x$/);
  });
});

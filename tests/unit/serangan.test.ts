import { describe, expect, it } from "vitest";
import { acak, buatBusur, easing, pilihBerbobot, pilihHost, titikPada, TUJUAN_ID } from "@/lib/serangan";
import { jarakKm, lingkaranBesar } from "@/lib/geo";
import type { AliranMasuk, HostID } from "@/lib/jenis";

describe("acak", () => {
  it("deterministik per seed, di [0,1)", () => {
    const a = acak(42);
    const b = acak(42);
    const x = Array.from({ length: 50 }, () => a());
    expect(x).toEqual(Array.from({ length: 50 }, () => b()));
    expect(x.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("pilihBerbobot", () => {
  it("frekuensi sebanding bobot", () => {
    const r = acak(7);
    const hit = { a: 0, b: 0 };
    for (let i = 0; i < 20000; i++) hit[pilihBerbobot(["a", "b"] as const, (x) => (x === "a" ? 3 : 1), r())!]++;
    expect(hit.a / hit.b).toBeGreaterThan(2.6);
    expect(hit.a / hit.b).toBeLessThan(3.4);
  });
  it("tanpa bobot -> undefined", () => {
    expect(pilihBerbobot([1, 2], () => 0, 0.5)).toBeUndefined();
    expect(pilihBerbobot([], () => 1, 0.5)).toBeUndefined();
  });
});

const ALIRAN: AliranMasuk[] = [
  { asal: "US", kategori: "web", persen: 13, sumber: "cloudflare-l7" },
  { asal: "HU", kategori: "ddos", persen: 34, sumber: "cloudflare-l3" },
  { asal: "??", kategori: "web", persen: 99, sumber: "x" },
];

describe("buatBusur", () => {
  it("mendarat dekat Jakarta, mulai dekat negara asal, tinggi & durasi wajar", () => {
    const r = acak(1);
    for (let i = 0; i < 30; i++) {
      const b = buatBusur(ALIRAN, r, 1000)!;
      expect(["US", "HU"]).toContain(b.kode);
      const [lon, lat] = b.titik[b.titik.length - 1];
      expect(jarakKm(lon, lat, TUJUAN_ID[0], TUJUAN_ID[1])).toBeLessThan(150);
      expect(b.tinggi).toBeGreaterThan(0);
      expect(b.tinggi).toBeLessThanOrEqual(0.3);
      expect(b.durasi).toBeGreaterThanOrEqual(1300);
      expect(b.durasi).toBeLessThanOrEqual(3900);
    }
  });
  it("filter kategori dihormati; kosong -> null", () => {
    const r = acak(2);
    for (let i = 0; i < 20; i++) expect(buatBusur(ALIRAN, r, 0, new Set(["ddos"]))!.kategori).toBe("ddos");
    expect(buatBusur(ALIRAN, r, 0, new Set(["spam"]))).toBeNull();
    expect(buatBusur([], r, 0)).toBeNull();
  });
});

describe("easing & titikPada", () => {
  it("easing 0->0, 1->1, monoton", () => {
    expect(easing(0)).toBe(0);
    expect(easing(1)).toBe(1);
    expect(easing(-1)).toBe(0);
    let lama = -1;
    for (let f = 0; f <= 1; f += 0.05) {
      expect(easing(f)).toBeGreaterThanOrEqual(lama);
      lama = easing(f);
    }
  });
  it("interpolasi polyline", () => {
    const p: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(titikPada(p, 0)).toEqual([0, 0]);
    expect(titikPada(p, 0.25)).toEqual([5, 0]);
    expect(titikPada(p, 1)).toEqual([10, 10]);
    expect(titikPada([], 0.5)).toEqual([0, 0]);
  });
});

describe("lingkaranBesar", () => {
  it("ujung tepat, bujur kontinu melewati garis tanggal", () => {
    const t = lingkaranBesar([170, 0], [-170, 0], 20);
    expect(t[0][0]).toBeCloseTo(170);
    expect(t[20][0]).toBeCloseTo(190);
    for (let i = 1; i < t.length; i++) expect(Math.abs(t[i][0] - t[i - 1][0])).toBeLessThan(5);
  });
  it("jarak Jakarta–Singapura ~ 880 km", () => {
    expect(jarakKm(106.85, -6.2, 103.82, 1.35)).toBeGreaterThan(850);
    expect(jarakKm(106.85, -6.2, 103.82, 1.35)).toBeLessThan(910);
  });
});

describe("pilihHost", () => {
  const h = (id: string, kategori: HostID["kategori"], waktu: string): HostID => ({ id, ip: "1.2.x.x", lon: 0, lat: 0, kota: "K", kategori, sumber: "s", jumlah: 1, waktu });
  it("menghormati filter, host baru lebih sering", () => {
    const daftar = [h("baru", "spam", "2026-11-15T00:00:00Z"), h("lama", "spam", "2026-10-01T00:00:00Z"), h("brute", "bruteforce", "2026-11-15T00:00:00Z")];
    const r = acak(3);
    const now = Date.parse("2026-11-15T01:00:00Z");
    const hit: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const x = pilihHost(daftar, r, now, new Set(["spam"]))!;
      hit[x.id] = (hit[x.id] ?? 0) + 1;
    }
    expect(hit.brute).toBeUndefined();
    expect(hit.baru).toBeGreaterThan(hit.lama * 3);
  });
});

/**
 * Penjadwal busur serangan dan "ping" host. Murni (tanpa DOM), dipakai kanvas dan dites di tests/unit.
 *
 * Penting soal kejujuran: busur BUKAN paket serangan satu per satu. Tiap busur adalah sampel acak yang
 * peluangnya sebanding porsi negara asal di data Cloudflare Radar (7 hari). Jadi kalau China 20%,
 * kira-kira 1 dari 5 busur datang dari China.
 */

import type { AliranMasuk, HostID, Kategori } from "./jenis";
import { SENTROID } from "./negara";
import { jarakKm, lingkaranBesar, R_BUMI_KM } from "./geo";

/** Titik akhir busur. Cloudflare cuma tahu negara target, jadi semua busur mendarat di sekitar Jakarta. */
export const TUJUAN_ID: [number, number] = [106.83, -6.2];

export interface Busur {
  id: number;
  kode: string;
  kategori: Kategori;
  titik: [number, number][];
  /** tinggi puncak busur di globe, satuan jari-jari bumi */
  tinggi: number;
  mulai: number;
  durasi: number;
}

/** PRNG kecil yang bisa di-seed (mulberry32), supaya tes deterministik. */
export function acak(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pilih satu elemen dengan peluang sebanding bobotnya. r di [0, 1). */
export function pilihBerbobot<T>(daftar: T[], bobot: (x: T) => number, r: number): T | undefined {
  let total = 0;
  for (const x of daftar) total += Math.max(0, bobot(x));
  if (total <= 0) return undefined;
  let sisa = r * total;
  for (const x of daftar) {
    sisa -= Math.max(0, bobot(x));
    if (sisa < 0) return x;
  }
  return daftar[daftar.length - 1];
}

let idBerikut = 1;

export function buatBusur(aliran: AliranMasuk[], rnd: () => number, now: number, filter?: Set<Kategori>): Busur | null {
  const kandidat = aliran.filter((a) => SENTROID[a.asal] && (!filter || filter.has(a.kategori)));
  const a = pilihBerbobot(kandidat, (x) => x.persen, rnd());
  if (!a) return null;
  const [lon0, lat0] = SENTROID[a.asal];
  // sebar sedikit di sekitar titik tengah negara supaya busur gak numpuk di satu garis
  const asal: [number, number] = [lon0 + (rnd() - 0.5) * 4, lat0 + (rnd() - 0.5) * 3];
  const tujuan: [number, number] = [TUJUAN_ID[0] + (rnd() - 0.5) * 1.6, TUJUAN_ID[1] + (rnd() - 0.5) * 1.0];
  const km = jarakKm(asal[0], asal[1], tujuan[0], tujuan[1]);
  const rad = km / R_BUMI_KM;
  return {
    id: idBerikut++,
    kode: a.asal,
    kategori: a.kategori,
    titik: lingkaranBesar(asal, tujuan, 48),
    tinggi: Math.min(0.3, 0.035 + 0.11 * rad),
    mulai: now,
    durasi: 1300 + Math.min(2600, km * 0.16),
  };
}

/** Pelan di awal dan akhir, biar kayak rudal yang lepas landas lalu menghunjam. */
export function easing(f: number): number {
  const x = Math.min(1, Math.max(0, f));
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** Titik pada polyline di fraksi u (0..1), interpolasi linier antar titik. */
export function titikPada(titik: [number, number][], u: number): [number, number] {
  const n = titik.length;
  if (n === 0) return [0, 0];
  const idx = Math.min(n - 1, Math.max(0, u * (n - 1)));
  const i0 = Math.floor(idx);
  const i1 = Math.min(n - 1, i0 + 1);
  const f = idx - i0;
  return [titik[i0][0] + (titik[i1][0] - titik[i0][0]) * f, titik[i0][1] + (titik[i1][1] - titik[i0][1]) * f];
}

/**
 * Pilih host untuk "ping" berikutnya: yang lebih baru dan subnet-nya lebih ramai lebih sering muncul.
 * Waktu yang ditampilkan di feed tetap waktu asli indikatornya, bukan waktu ping.
 */
export function pilihHost(host: HostID[], rnd: () => number, now: number, filter?: Set<Kategori>): HostID | undefined {
  const kandidat = filter ? host.filter((h) => filter.has(h.kategori)) : host;
  return pilihBerbobot(
    kandidat,
    (h) => {
      const umurHari = Math.max(0, (now - Date.parse(h.waktu)) / 86_400_000);
      return (1 + Math.log2(1 + (h.jumlah ?? 1))) / (1 + umurHari / 3);
    },
    rnd(),
  );
}

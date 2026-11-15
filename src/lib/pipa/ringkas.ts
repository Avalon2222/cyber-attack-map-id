/**
 * Menggabungkan semua feed yang sudah di-parse jadi satu Snapshot. Murni (tanpa jaringan), jadi bisa dites.
 *
 * Kalau satu sumber gagal di run ini, bagian snapshot lama dipakai lagi (carry-over), supaya peta gak
 * tiba-tiba kosong cuma karena satu API lagi down.
 */

import type { AliranMasuk, HostID, Kampanye, Kategori, KorbanRansomware, Porsi, Snapshot, StatusSumber, TitikTren } from "../jenis";
import type { BarisFeodo, BarisUrlhaus } from "./parser";
import { samarkanIp } from "./parser";
import type { LokasiIp } from "./geoip";

export interface DaftarBlocklist {
  nama: string;
  kategori: Kategori;
  label: string;
  ips: string[];
}

export interface DataRadar {
  asalL7: Porsi[];
  asalL3: Porsi[];
  periode?: { mulai: string; akhir: string };
  tren: { tanggal: string; porsiL7?: number; porsiL3?: number }[];
}

export interface Bahan {
  sekarang: Date;
  sumber: StatusSumber[];
  geo: (ip: string) => LokasiIp | null;
  asn?: (ip: string) => { asn: number; nama: string } | null;
  urlhaus?: BarisUrlhaus[];
  blocklist?: DaftarBlocklist[];
  /** IP gabungan semua daftar blocklist.de (all.txt), untuk sebaran negara global */
  blocklistSemua?: string[];
  feodo?: BarisFeodo[];
  iscPort?: Snapshot["globalPort"];
  radar?: DataRadar;
  abuse?: { ip: string; negara: string; skor: number; waktu: string }[];
  otx?: Kampanye[];
  ransomware?: KorbanRansomware[];
  lama?: Snapshot | null;
}

export const HARI_URLHAUS = 30;
export const MAKS_HOST = 2500;

/** id pendek stabil dari string (FNV-1a), supaya IP asli gak ikut ke JSON */
export function hashPendek(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function bulat(x: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** Hitung porsi negara (persen) dari daftar kode negara. */
export function porsiNegara(kode: string[], batas = 20): { porsi: Porsi[]; total: number; peringkat: (k: string) => number } {
  const hit = new Map<string, number>();
  for (const k of kode) if (k) hit.set(k, (hit.get(k) ?? 0) + 1);
  const total = kode.length;
  const urut = [...hit.entries()].sort((a, b) => b[1] - a[1]);
  return {
    porsi: urut.slice(0, batas).map(([k, n]) => ({ kode: k, persen: bulat((100 * n) / Math.max(1, total)) })),
    total,
    peringkat: (k: string) => urut.findIndex(([x]) => x === k) + 1,
  };
}

/** Busur masuk ke Indonesia dari porsi asal Radar. Asal Indonesia sendiri (domestik) tidak jadi busur. */
export function bangunAliran(radar: DataRadar | undefined): AliranMasuk[] {
  if (!radar) return [];
  const aliran: AliranMasuk[] = [];
  for (const p of radar.asalL7) if (p.kode !== "ID" && p.persen > 0) aliran.push({ asal: p.kode, kategori: "web", persen: p.persen, sumber: "cloudflare-l7" });
  for (const p of radar.asalL3) if (p.kode !== "ID" && p.persen > 0) aliran.push({ asal: p.kode, kategori: "ddos", persen: p.persen, sumber: "cloudflare-l3" });
  return aliran;
}

interface Kelompok {
  h: HostID;
  ips: Set<string>;
}

/**
 * Host dikelompokkan per /24 + kategori + sumber: blocklist kadang mendaftarkan satu blok penuh
 * (ratusan IP satu subnet), jadi satu titik per subnet dengan jumlah IP-nya, bukan ratusan titik numpuk.
 */
function tambahHost(peta: Map<string, Kelompok>, ip: string, lok: LokasiIp | null, h: Omit<HostID, "id" | "ip" | "lon" | "lat" | "kota" | "jumlah">) {
  if (!lok || lok.negara !== "ID" || lok.lon === undefined || lok.lat === undefined) return;
  if (!Number.isFinite(lok.lon) || !Number.isFinite(lok.lat) || (lok.lon === 0 && lok.lat === 0)) return;
  const subnet = ip.split(".").slice(0, 3).join(".");
  const kunci = `${subnet}|${h.kategori}|${h.sumber}`;
  const ada = peta.get(kunci);
  if (ada) {
    ada.ips.add(ip);
    ada.h.jumlah = ada.ips.size;
    if (h.waktu > ada.h.waktu) Object.assign(ada.h, { waktu: h.waktu, rinci: h.rinci });
    return;
  }
  peta.set(kunci, {
    ips: new Set([ip]),
    h: {
      id: hashPendek(kunci),
      ip: samarkanIp(ip),
      lon: bulat(lok.lon, 3),
      lat: bulat(lok.lat, 3),
      kota: lok.kota || lok.provinsi || "Indonesia",
      jumlah: 1,
      ...h,
    },
  });
}

export function ringkas(b: Bahan): Snapshot {
  const now = b.sekarang;
  const iso = now.toISOString();
  const lama = b.lama ?? null;
  const batasUrlhaus = now.getTime() - HARI_URLHAUS * 86_400_000;

  // ---------- host di Indonesia ----------
  const host = new Map<string, Kelompok>();
  const asnHit = new Map<number, { nama: string; ips: Set<string> }>();
  const catatAsn = (ip: string, asnAwal?: number) => {
    const a = b.asn?.(ip);
    const n = a?.asn ?? asnAwal;
    if (!n) return undefined;
    const e = asnHit.get(n) ?? { nama: a?.nama ?? "", ips: new Set<string>() };
    if (!e.nama && a?.nama) e.nama = a.nama;
    e.ips.add(ip);
    asnHit.set(n, e);
    return n;
  };

  const urlhausBaru = (b.urlhaus ?? []).filter((r) => Date.parse(r.waktu) >= batasUrlhaus);
  for (const r of urlhausBaru) {
    const lok = b.geo(r.ip);
    if (lok?.negara !== "ID") continue;
    const asn = catatAsn(r.ip, r.asn);
    const rinci = [r.ancaman.replace(/_/g, " "), r.berkas ? `berkas ${r.berkas}` : "", r.status].filter(Boolean).join(" · ");
    tambahHost(host, r.ip, lok, { kategori: "malware", sumber: "urlhaus", waktu: r.waktu, rinci, asn });
  }

  for (const d of b.blocklist ?? []) {
    for (const ip of d.ips) {
      const lok = b.geo(ip);
      if (lok?.negara !== "ID") continue;
      const asn = catatAsn(ip);
      tambahHost(host, ip, lok, { kategori: d.kategori, sumber: "blocklist.de", waktu: iso, rinci: d.label, asn });
    }
  }

  for (const f of b.feodo ?? []) {
    const lok = b.geo(f.ip);
    if (lok?.negara !== "ID" && f.negara !== "ID") continue;
    const asn = catatAsn(f.ip, f.asn);
    const waktu = /^\d{4}-\d{2}-\d{2}/.test(f.terakhir) ? `${f.terakhir.slice(0, 10)}T00:00:00Z` : iso;
    tambahHost(host, f.ip, lok, { kategori: "botnet", sumber: "feodo", waktu, rinci: `${f.malware} C2 · ${f.status}`, asn });
  }

  for (const a of b.abuse ?? []) {
    if (a.negara !== "ID") continue;
    const lok = b.geo(a.ip);
    const asn = catatAsn(a.ip);
    tambahHost(host, a.ip, lok, { kategori: "laporan", sumber: "abuseipdb", waktu: a.waktu || iso, rinci: `abuse confidence ${a.skor}%`, asn });
  }

  // AbuseIPDB cuma diambil tiap ~6 jam (kuota): di run lain, host dari snapshot lama dipertahankan
  if (!b.abuse && lama) for (const h of lama.host) if (h.sumber === "abuseipdb") host.set(`lama|${h.id}`, { h, ips: new Set([h.id]) });

  const adaHostBaru = host.size > 0;
  let daftarHost = [...host.values()].map((k) => k.h).sort((x, y) => y.waktu.localeCompare(x.waktu)).slice(0, MAKS_HOST);
  if (!adaHostBaru && lama) daftarHost = lama.host;

  // ---------- agregat host ----------
  const kotaMap = new Map<string, { kota: string; lon: number; lat: number; jumlah: number }>();
  const katHit = new Map<Kategori, number>();
  for (const h of daftarHost) {
    const k = kotaMap.get(h.kota) ?? { kota: h.kota, lon: h.lon, lat: h.lat, jumlah: 0 };
    k.jumlah += h.jumlah;
    kotaMap.set(h.kota, k);
    katHit.set(h.kategori, (katHit.get(h.kategori) ?? 0) + h.jumlah);
  }
  const kota = [...kotaMap.values()].sort((a, c) => c.jumlah - a.jumlah);
  const kategori = [...katHit.entries()].map(([k, n]) => ({ kategori: k, jumlah: n })).sort((a, c) => c.jumlah - a.jumlah);
  const asn = adaHostBaru
    ? [...asnHit.entries()]
        .map(([n, e]) => ({ asn: n, nama: e.nama || `AS${n}`, jumlah: e.ips.size }))
        .sort((a, c) => c.jumlah - a.jumlah)
        .slice(0, 12)
    : (lama?.asn ?? []);

  // ---------- tren harian ----------
  const tren = new Map<string, TitikTren>();
  const hari = (t: number) => new Date(t).toISOString().slice(0, 10);
  for (let i = HARI_URLHAUS - 1; i >= 0; i--) tren.set(hari(now.getTime() - i * 86_400_000), { tanggal: hari(now.getTime() - i * 86_400_000) });
  if (b.urlhaus) {
    for (const t of tren.values()) t.malwareBaru = 0;
    for (const r of urlhausBaru) {
      const t = tren.get(r.waktu.slice(0, 10));
      if (t) t.malwareBaru = (t.malwareBaru ?? 0) + 1;
    }
  } else if (lama) {
    for (const t of lama.tren) if (tren.has(t.tanggal) && t.malwareBaru !== undefined) tren.get(t.tanggal)!.malwareBaru = t.malwareBaru;
  }
  const trenRadar = b.radar?.tren ?? lama?.tren.filter((t) => t.porsiL7 !== undefined || t.porsiL3 !== undefined) ?? [];
  for (const r of trenRadar) {
    const t = tren.get(r.tanggal);
    if (!t) continue;
    if (r.porsiL7 !== undefined) t.porsiL7 = r.porsiL7;
    if (r.porsiL3 !== undefined) t.porsiL3 = r.porsiL3;
  }

  // ---------- sebaran asal global ----------
  let globalAsal = lama?.globalAsal ?? [];
  let peringkatID = lama?.peringkatID;
  if (b.abuse?.length) {
    const p = porsiNegara(b.abuse.map((a) => a.negara));
    globalAsal = p.porsi;
    peringkatID = { posisi: p.peringkat("ID"), dari: new Set(b.abuse.map((a) => a.negara)).size, jumlah: b.abuse.filter((a) => a.negara === "ID").length, sumber: "abuseipdb" };
  } else if (b.blocklistSemua?.length && lama?.peringkatID?.sumber !== "abuseipdb") {
    const negara = b.blocklistSemua.map((ip) => b.geo(ip)?.negara ?? "");
    const p = porsiNegara(negara.filter(Boolean));
    globalAsal = p.porsi;
    peringkatID = { posisi: p.peringkat("ID"), dari: new Set(negara.filter(Boolean)).size, jumlah: negara.filter((n) => n === "ID").length, sumber: "blocklist.de" };
  }

  const radar = b.radar;
  return {
    versi: 1,
    dibuat: iso,
    sumber: b.sumber,
    masuk: radar
      ? { aliran: bangunAliran(radar), asalL7: radar.asalL7, asalL3: radar.asalL3, periode: radar.periode }
      : (lama?.masuk ?? { aliran: [], asalL7: [], asalL3: [] }),
    tren: [...tren.values()],
    host: daftarHost,
    kota,
    kategori,
    asn,
    globalPort: b.iscPort?.length ? b.iscPort.slice(0, 10) : (lama?.globalPort ?? []),
    globalAsal,
    peringkatID,
    kampanye: b.otx ? b.otx.slice(0, 25) : (lama?.kampanye ?? []),
    ransomware: b.ransomware ? b.ransomware.slice(0, 200) : (lama?.ransomware ?? []),
  };
}

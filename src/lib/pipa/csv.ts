/**
 * Ekspor snapshot ke CSV sederhana di data/ (dipakai proyek lain, mis. chatbot talk-to-the-data).
 * Tanpa kolom IP sama sekali, cuma agregat dan lokasi level kota.
 */

import type { Snapshot } from "../jenis";
import { namaNegara } from "../negara";

function sel(v: string | number | undefined): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function tabel(kolom: string[], baris: (string | number | undefined)[][]): string {
  return [kolom.join(","), ...baris.map((b) => b.map(sel).join(","))].join("\n") + "\n";
}

export function snapshotKeCsv(s: Snapshot): Record<string, string> {
  const mulai = s.masuk.periode?.mulai.slice(0, 10) ?? "";
  const akhir = s.masuk.periode?.akhir.slice(0, 10) ?? "";
  const asal = [
    ...s.masuk.asalL7.map((p) => ["web_l7", p.kode, namaNegara(p.kode, "id"), p.persen.toFixed(2), mulai, akhir]),
    ...s.masuk.asalL3.map((p) => ["ddos_l3", p.kode, namaNegara(p.kode, "id"), p.persen.toFixed(2), mulai, akhir]),
  ];
  return {
    "asal_serangan.csv": tabel(["lapisan", "kode_negara", "negara", "persen", "mulai", "akhir"], asal),
    "host_indonesia.csv": tabel(
      ["kota", "lat", "lon", "kategori", "sumber", "jumlah_ip", "asn", "terakhir"],
      s.host.map((h) => [h.kota, h.lat, h.lon, h.kategori, h.sumber, h.jumlah, h.asn, h.waktu.slice(0, 10)]),
    ),
    "tren_harian.csv": tabel(
      ["tanggal", "malware_baru", "porsi_l7"],
      s.tren.map((t) => [t.tanggal, t.malwareBaru, t.porsiL7 === undefined ? undefined : t.porsiL7.toFixed(4)]),
    ),
  };
}

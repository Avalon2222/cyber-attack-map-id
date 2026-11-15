/**
 * Bentuk snapshot ancaman yang dibangun scripts/ambil_data.ts (GitHub Actions) dan dibaca browser.
 * Satu berkas JSON: public/data/ancaman.json (seed di repo) dan cabang `data` (diperbarui otomatis).
 */

/** Kategori serangan; menentukan warna busur dan titik. */
export type Kategori = "ddos" | "web" | "bruteforce" | "malware" | "botnet" | "scan" | "spam" | "laporan";

export const KATEGORI: Kategori[] = ["ddos", "web", "bruteforce", "malware", "botnet", "scan", "spam", "laporan"];

export interface StatusSumber {
  id: string;
  nama: string;
  url: string;
  /** berhasil diambil di run ini (false = gagal / belum ada kunci; data lama dipakai bila ada) */
  ok: boolean;
  /** jumlah baris/indikator yang dipakai */
  jumlah: number;
  /** waktu data sumber ini terakhir berhasil diambil (ISO) */
  diperbarui?: string;
  catatan?: string;
}

/** Porsi suatu negara (alpha-2) dalam persen. */
export interface Porsi {
  kode: string;
  persen: number;
}

/** Aliran masuk ke Indonesia: dari negara asal, berbobot porsi (persen). Digambar sebagai busur. */
export interface AliranMasuk {
  asal: string;
  kategori: Kategori;
  persen: number;
  sumber: string;
}

/** Host di Indonesia yang tercatat jahat/terinfeksi (posisi kira-kira, level kota). */
export interface HostID {
  id: string;
  /** IP disamarkan dua oktet terakhir, misal 103.172.x.x */
  ip: string;
  lon: number;
  lat: number;
  kota: string;
  kategori: Kategori;
  sumber: string;
  /** jumlah IP unik dalam subnet /24 ini */
  jumlah: number;
  /** waktu terlihat (ISO) */
  waktu: string;
  rinci?: string;
  asn?: number;
}

export interface Kota {
  kota: string;
  lon: number;
  lat: number;
  jumlah: number;
}

export interface Kampanye {
  id: string;
  judul: string;
  tanggal: string;
  aktor?: string;
  malware: string[];
  industri: string[];
  url: string;
}

export interface KorbanRansomware {
  tanggal: string;
  grup: string;
  sektor: string;
}

export interface TitikTren {
  /** YYYY-MM-DD (UTC) */
  tanggal: string;
  /** porsi serangan L7 global yang menyasar Indonesia (%) */
  porsiL7?: number;
  /** porsi serangan L3 (DDoS jaringan) global yang menyasar Indonesia (%) */
  porsiL3?: number;
  /** URL malware baru yang di-host di jaringan Indonesia hari itu (URLhaus) */
  malwareBaru?: number;
}

export interface Snapshot {
  versi: 1;
  /** waktu snapshot dibuat (ISO) */
  dibuat: string;
  sumber: StatusSumber[];
  masuk: {
    aliran: AliranMasuk[];
    asalL7: Porsi[];
    asalL3: Porsi[];
    /** jendela waktu data Radar */
    periode?: { mulai: string; akhir: string };
  };
  tren: TitikTren[];
  host: HostID[];
  kota: Kota[];
  /** jumlah host Indonesia per kategori */
  kategori: { kategori: Kategori; jumlah: number }[];
  asn: { asn: number; nama: string; jumlah: number }[];
  /** port paling banyak diserang di sensor global DShield (bukan khusus Indonesia) */
  globalPort: { port: number; layanan: string; record: number; sumber: number }[];
  /** negara asal IP penyerang global (blocklist.de / AbuseIPDB), termasuk posisi Indonesia */
  globalAsal: Porsi[];
  peringkatID?: { posisi: number; dari: number; jumlah: number; sumber: string };
  kampanye: Kampanye[];
  ransomware: KorbanRansomware[];
}

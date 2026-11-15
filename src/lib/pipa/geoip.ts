/**
 * Indeks GeoIP IPv4 dari DB-IP "IP to City Lite" (CC BY 4.0, https://db-ip.com).
 * Baris CSV: ip_awal,ip_akhir,benua,negara,provinsi,kota,lat,lon
 *
 * Supaya hemat memori, semua negara cuma menyimpan kode negaranya; nama kota, provinsi, dan koordinat
 * hanya disimpan untuk satu negara fokus (Indonesia). Pencarian pakai binary search.
 */

import { pecahCsv } from "./parser";

export interface LokasiIp {
  negara: string;
  kota?: string;
  provinsi?: string;
  lon?: number;
  lat?: number;
}

export function ipKeAngka(ip: string): number {
  const p = ip.split(".");
  if (p.length !== 4) return -1;
  let n = 0;
  for (const s of p) {
    const v = Number(s);
    if (!Number.isInteger(v) || v < 0 || v > 255) return -1;
    n = n * 256 + v;
  }
  return n;
}

export class IndeksGeoIp {
  private awal: Float64Array;
  private akhir: Float64Array;
  private negara: Uint16Array;
  private detail: Int32Array;
  private kodeNegara: string[] = [];
  private kodeKeIdx = new Map<string, number>();
  private rincian: { kota: string; provinsi: string; lon: number; lat: number }[] = [];
  private n = 0;

  constructor(
    kapasitas = 1 << 20,
    private fokus = "ID",
  ) {
    this.awal = new Float64Array(kapasitas);
    this.akhir = new Float64Array(kapasitas);
    this.negara = new Uint16Array(kapasitas);
    this.detail = new Int32Array(kapasitas);
  }

  get ukuran(): number {
    return this.n;
  }

  private tumbuh() {
    const k = this.awal.length * 2;
    const salin = <T extends Float64Array | Uint16Array | Int32Array>(a: T, b: T) => (b.set(a), b);
    this.awal = salin(this.awal, new Float64Array(k));
    this.akhir = salin(this.akhir, new Float64Array(k));
    this.negara = salin(this.negara, new Uint16Array(k));
    this.detail = salin(this.detail, new Int32Array(k));
  }

  /** Tambah satu baris CSV DB-IP. Baris IPv6 dan rusak dilewati. Baris harus urut naik (format DB-IP memang urut). */
  tambahBaris(baris: string): void {
    if (!baris || baris.includes(":")) return;
    const f = pecahCsv(baris);
    if (f.length < 8) return;
    const a = ipKeAngka(f[0]);
    const b = ipKeAngka(f[1]);
    if (a < 0 || b < a) return;
    const kode = f[3];
    if (!kode || kode === "ZZ") return;
    if (this.n >= this.awal.length) this.tumbuh();
    let idx = this.kodeKeIdx.get(kode);
    if (idx === undefined) {
      idx = this.kodeNegara.length;
      this.kodeNegara.push(kode);
      this.kodeKeIdx.set(kode, idx);
    }
    this.awal[this.n] = a;
    this.akhir[this.n] = b;
    this.negara[this.n] = idx;
    if (kode === this.fokus) {
      this.detail[this.n] = this.rincian.length;
      this.rincian.push({ provinsi: f[4], kota: f[5], lat: Number(f[6]), lon: Number(f[7]) });
    } else this.detail[this.n] = -1;
    this.n++;
  }

  cari(ip: string): LokasiIp | null {
    const x = ipKeAngka(ip);
    if (x < 0) return null;
    let lo = 0;
    let hi = this.n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.awal[mid] > x) hi = mid - 1;
      else if (this.akhir[mid] < x) lo = mid + 1;
      else {
        const hasil: LokasiIp = { negara: this.kodeNegara[this.negara[mid]] };
        const d = this.detail[mid];
        if (d >= 0) Object.assign(hasil, this.rincian[d]);
        return hasil;
      }
    }
    return null;
  }
}

/** Indeks ASN IPv4 dari DB-IP "IP to ASN Lite": ip_awal,ip_akhir,asn,nama_organisasi */
export class IndeksAsn {
  private awal: number[] = [];
  private akhir: number[] = [];
  private asn: number[] = [];
  private nama = new Map<number, string>();

  get ukuran(): number {
    return this.awal.length;
  }

  tambahBaris(baris: string): void {
    if (!baris || baris.includes(":")) return;
    const f = pecahCsv(baris);
    if (f.length < 4) return;
    const a = ipKeAngka(f[0]);
    const b = ipKeAngka(f[1]);
    const n = Number(f[2]);
    if (a < 0 || b < a || !n) return;
    this.awal.push(a);
    this.akhir.push(b);
    this.asn.push(n);
    if (!this.nama.has(n)) this.nama.set(n, f[3]);
  }

  namaAsn(asn: number): string | undefined {
    return this.nama.get(asn);
  }

  cari(ip: string): { asn: number; nama: string } | null {
    const x = ipKeAngka(ip);
    if (x < 0) return null;
    let lo = 0;
    let hi = this.awal.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.awal[mid] > x) hi = mid - 1;
      else if (this.akhir[mid] < x) lo = mid + 1;
      else return { asn: this.asn[mid], nama: this.nama.get(this.asn[mid]) ?? "" };
    }
    return null;
  }
}

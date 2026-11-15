/**
 * Kanvas 2D di atas peta MapLibre: busur serangan yang melengkung di atas globe, kepala menyala dengan
 * ekor, riak saat mendarat, dan "ping" di host Indonesia. Digambar tiap frame dengan matriks globe MapLibre
 * (lihat proyeksi.ts), lengkap dengan uji oklusi di balik bumi.
 */

import type { Map as MapLibre } from "maplibre-gl";
import type { AliranMasuk, HostID, Kategori } from "../jenis";
import { WARNA, rgba } from "../warna";
import { buatBusur, easing, pilihHost, titikPada, TUJUAN_ID, type Busur } from "../serangan";
import { buatProyektor, proyeksi, titikKosong, type Proyektor, type TitikLayar } from "./proyeksi";

interface Riak {
  lon: number;
  lat: number;
  warna: string;
  mulai: number;
  durasi: number;
  besar: number;
}

const EKOR = 0.28;

export class KanvasSerangan {
  readonly kanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private busur: Busur[] = [];
  private riak: Riak[] = [];
  private raf = 0;
  private terakhirBusur = 0;
  private terakhirPing = 0;
  private dpr = 1;
  private ro: ResizeObserver;
  private rnd = Math.random;

  aliran: AliranMasuk[] = [];
  host: HostID[] = [];
  filter: Set<Kategori> | undefined;
  jeda = false;
  /** busur baru per detik (desktop ~5, HP lebih sedikit) */
  laju = 5;
  /** ping host per detik */
  lajuPing = 1.4;
  onPing?: (h: HostID) => void;
  onBusur?: (b: Busur) => void;

  constructor(
    private map: MapLibre,
    wadah: HTMLElement,
  ) {
    this.kanvas = document.createElement("canvas");
    this.kanvas.className = "kanvas-serangan";
    this.kanvas.setAttribute("aria-hidden", "true");
    Object.assign(this.kanvas.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "1" });
    wadah.appendChild(this.kanvas);
    const ctx = this.kanvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d tidak tersedia");
    this.ctx = ctx;
    this.ro = new ResizeObserver(() => this.ukur());
    this.ro.observe(wadah);
    this.ukur();
    this.raf = requestAnimationFrame(this.frame);
  }

  private ukur() {
    const w = this.kanvas.parentElement?.clientWidth ?? 0;
    const h = this.kanvas.parentElement?.clientHeight ?? 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.kanvas.width = Math.round(w * this.dpr);
    this.kanvas.height = Math.round(h * this.dpr);
    this.kanvas.style.width = `${w}px`;
    this.kanvas.style.height = `${h}px`;
    // HP: lebih sedikit busur supaya tetap mulus dan gak semrawut
    this.laju = w < 640 ? 2.6 : 5;
  }

  /** Jumlah busur yang sedang terbang (dipakai tes e2e). */
  get aktif(): number {
    return this.busur.length;
  }

  hancurkan() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.kanvas.remove();
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) return;
    const w = this.kanvas.width / this.dpr;
    const h = this.kanvas.height / this.dpr;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!this.jeda) this.jadwalkan(now);
    const p = buatProyektor(this.map, w, h);
    ctx.globalCompositeOperation = "lighter";
    this.gambarBusur(p, now);
    this.gambarRiak(p, now);
    ctx.globalCompositeOperation = "source-over";
    if (this.aliran.length) this.gambarTarget(p, now);
  };

  private jadwalkan(now: number) {
    // batasi tumpukan setelah tab lama di background
    if (now - this.terakhirBusur > 2000) this.terakhirBusur = now - 2000;
    const jeda = 1000 / this.laju;
    while (this.aliran.length && now - this.terakhirBusur >= jeda) {
      this.terakhirBusur += jeda * (0.6 + this.rnd() * 0.8);
      const b = buatBusur(this.aliran, this.rnd, now, this.filter);
      if (!b) break;
      this.busur.push(b);
      this.onBusur?.(b);
    }
    if (now - this.terakhirPing > 4000) this.terakhirPing = now - 4000;
    const jedaPing = 1000 / this.lajuPing;
    while (this.host.length && now - this.terakhirPing >= jedaPing) {
      this.terakhirPing += jedaPing * (0.5 + this.rnd());
      const hst = pilihHost(this.host, this.rnd, Date.now(), this.filter);
      if (!hst) break;
      this.riak.push({ lon: hst.lon, lat: hst.lat, warna: WARNA[hst.kategori], mulai: now, durasi: 1600, besar: 14 + Math.min(16, Math.log2(1 + hst.jumlah) * 4) });
      this.onPing?.(hst);
    }
    if (this.busur.length > 90) this.busur.splice(0, this.busur.length - 90);
    if (this.riak.length > 60) this.riak.splice(0, this.riak.length - 60);
  }

  /** Proyeksi satu titik busur pada fraksi u (0..1); mode datar mengangkat busur di ruang layar. */
  private titikBusur(p: Proyektor, b: Busur, u: number, keluar: TitikLayar, angkatDatar: number): boolean {
    const [lon, lat] = titikPada(b.titik, u);
    const naik = Math.sin(Math.PI * u);
    if (p.globe) return proyeksi(p, lon, lat, 0, keluar, b.tinggi * naik) && keluar.terlihat;
    const ok = proyeksi(p, lon, lat, 0, keluar);
    keluar.y -= angkatDatar * naik;
    return ok;
  }

  private gambarBusur(p: Proyektor, now: number) {
    const ctx = this.ctx;
    const t = titikKosong();
    const a = titikKosong();
    const z = titikKosong();
    ctx.lineCap = "round";
    const sisa: Busur[] = [];
    for (const b of this.busur) {
      const f = (now - b.mulai) / b.durasi;
      if (f >= 1) {
        const [lon, lat] = b.titik[b.titik.length - 1];
        this.riak.push({ lon, lat, warna: WARNA[b.kategori], mulai: now, durasi: 900, besar: 22 });
        continue;
      }
      sisa.push(b);
      const warna = WARNA[b.kategori];
      // angkat busur di mode datar: sebanding panjang busur di layar
      let angkat = 0;
      if (!p.globe) {
        proyeksi(p, b.titik[0][0], b.titik[0][1], 0, a);
        proyeksi(p, b.titik[b.titik.length - 1][0], b.titik[b.titik.length - 1][1], 0, z);
        angkat = Math.min(180, Math.hypot(z.x - a.x, z.y - a.y) * 0.22);
      }
      const kepala = easing(f);
      // jejak tipis seluruh lintasan yang sudah dilalui
      ctx.beginPath();
      let buka = false;
      const langkah = 28;
      for (let i = 0; i <= langkah; i++) {
        const u = (kepala * i) / langkah;
        if (!this.titikBusur(p, b, u, t, angkat)) {
          buka = false;
          continue;
        }
        if (!buka) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
        buka = true;
      }
      const pudar = f > 0.85 ? (1 - f) / 0.15 : 1;
      ctx.strokeStyle = rgba(warna, 0.16 * pudar);
      ctx.lineWidth = 1;
      ctx.stroke();

      // ekor menyala: segmen-segmen dengan alpha naik ke arah kepala
      const ekor0 = Math.max(0, kepala - EKOR);
      const n = 12;
      let lx = 0;
      let ly = 0;
      let ada = false;
      for (let i = 0; i <= n; i++) {
        const u = ekor0 + ((kepala - ekor0) * i) / n;
        const ok = this.titikBusur(p, b, u, t, angkat);
        if (ok && ada) {
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = rgba(warna, (0.15 + 0.85 * (i / n)) * pudar);
          ctx.lineWidth = 0.6 + 2.2 * (i / n);
          ctx.stroke();
        }
        ada = ok;
        lx = t.x;
        ly = t.y;
      }
      if (ada) {
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 9);
        g.addColorStop(0, rgba("#ffffff", 0.95 * pudar));
        g.addColorStop(0.35, rgba(warna, 0.8 * pudar));
        g.addColorStop(1, rgba(warna, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.busur = sisa;
  }

  private gambarRiak(p: Proyektor, now: number) {
    const ctx = this.ctx;
    const t = titikKosong();
    const sisa: Riak[] = [];
    for (const r of this.riak) {
      const f = (now - r.mulai) / r.durasi;
      if (f >= 1) continue;
      sisa.push(r);
      if (!proyeksi(p, r.lon, r.lat, 0, t) || !t.terlihat) continue;
      const rad = 2 + r.besar * easing(f);
      ctx.beginPath();
      ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(r.warna, 0.85 * (1 - f));
      ctx.lineWidth = 1.6 * (1 - f) + 0.4;
      ctx.stroke();
      if (f < 0.25) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba("#ffffff", 0.9 * (1 - f / 0.25));
        ctx.fill();
      }
    }
    this.riak = sisa;
  }

  /** Bidikan berputar di titik tujuan busur (Indonesia). */
  private gambarTarget(p: Proyektor, now: number) {
    const ctx = this.ctx;
    const t = titikKosong();
    if (!proyeksi(p, TUJUAN_ID[0], TUJUAN_ID[1], 0, t) || !t.terlihat) return;
    const sudut = (now / 2400) % (Math.PI * 2);
    const r = 13;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = rgba("#ff2e4d", 0.85);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = sudut + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, a, a + 0.9);
      ctx.stroke();
    }
    const denyut = (now % 1800) / 1800;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4 + denyut * 16, 0, Math.PI * 2);
    ctx.strokeStyle = rgba("#ff2e4d", 0.5 * (1 - denyut));
    ctx.stroke();
    ctx.restore();
  }
}

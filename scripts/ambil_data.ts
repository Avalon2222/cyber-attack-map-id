/**
 * Ambil semua feed threat intel, gabungkan, tulis snapshot JSON.
 *
 *   npx tsx scripts/ambil_data.ts --keluar public/data/ancaman.json
 *
 * Kunci API (opsional, dibaca dari env; tanpa kunci sumbernya dilewati dan data lama dipakai):
 *   CLOUDFLARE_API_TOKEN  Cloudflare Radar (asal serangan L7/L3 yang menyasar Indonesia, tren harian)
 *   ABUSEIPDB_API_KEY     AbuseIPDB blacklist (maks 5x sehari di tier gratis, jadi dibatasi tiap 6 jam)
 *   OTX_API_KEY           AlienVault OTX pulse yang menyasar Indonesia
 *
 * Dijalankan GitHub Actions tiap beberapa jam (.github/workflows/snapshot-ancaman.yml).
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Snapshot, StatusSumber } from "../src/lib/jenis";
import { IndeksAsn, IndeksGeoIp } from "../src/lib/pipa/geoip";
import {
  DAFTAR_BLOCKLIST,
  parseAbuseBlacklist,
  parseDaftarIp,
  parseFeodo,
  parseIscPort,
  kandidatOtx,
  parseOtx,
  parseRadarTop,
  parseRansomware,
  parseUrlhaus,
  periodeRadar,
} from "../src/lib/pipa/parser";
import { ringkas, type Bahan, type DaftarBlocklist, type DataRadar } from "../src/lib/pipa/ringkas";

const UA = "cyber-attack-map-id/1.0 (+https://github.com/Avalon2222/cyber-attack-map-id)";
const URL_LAMA = "https://raw.githubusercontent.com/Avalon2222/cyber-attack-map-id/data/ancaman.json";

function arg(nama: string, bawaan?: string): string | undefined {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : bawaan;
}

async function ambil(url: string, init: RequestInit = {}, coba = 3): Promise<Response> {
  let galat: unknown;
  for (let i = 0; i < coba; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      galat = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw galat;
}

async function teks(url: string, init?: RequestInit): Promise<string> {
  const res = await ambil(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function json(url: string, init?: RequestInit): Promise<unknown> {
  return JSON.parse(await teks(url, init));
}

async function unduhBerkas(url: string, tujuan: string) {
  const res = await ambil(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${url}`);
  mkdirSync(dirname(tujuan), { recursive: true });
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tujuan));
}

/** Berkas DB-IP lite bulan ini (atau bulan lalu kalau belum terbit), disimpan di .cache/. */
async function siapkanDbip(jenis: "city" | "asn"): Promise<string> {
  const lokal = `.cache/dbip-${jenis}-lite.csv.gz`;
  if (existsSync(lokal)) return lokal;
  const now = new Date();
  for (const mundur of [0, 1]) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - mundur, 1));
    const bulan = d.toISOString().slice(0, 7);
    try {
      await unduhBerkas(`https://download.db-ip.com/free/dbip-${jenis}-lite-${bulan}.csv.gz`, lokal);
      return lokal;
    } catch (e) {
      console.warn(`DB-IP ${jenis} ${bulan} gagal:`, (e as Error).message);
    }
  }
  throw new Error(`DB-IP ${jenis} tidak bisa diunduh`);
}

async function bacaGz(path: string, tiapBaris: (b: string) => void) {
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const b of rl) tiapBaris(b);
}

async function muatLama(): Promise<Snapshot | null> {
  const path = arg("lama");
  try {
    if (path && existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as Snapshot;
    return (await json(URL_LAMA)) as Snapshot;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ sumber per sumber

const status: StatusSumber[] = [];
function catat(s: StatusSumber, lama: Snapshot | null) {
  if (!s.ok) {
    const sebelumnya = lama?.sumber.find((x) => x.id === s.id);
    if (sebelumnya?.diperbarui) s.diperbarui = sebelumnya.diperbarui;
  }
  status.push(s);
  console.log(`${s.ok ? "✓" : "✗"} ${s.nama}: ${s.jumlah}${s.catatan ? ` (${s.catatan})` : ""}`);
}

async function cobaSumber<T>(
  meta: Omit<StatusSumber, "ok" | "jumlah">,
  lama: Snapshot | null,
  kerja: () => Promise<{ data: T; jumlah: number; catatan?: string } | null>,
): Promise<T | undefined> {
  try {
    const r = await kerja();
    if (!r) {
      catat({ ...meta, ok: false, jumlah: 0, catatan: meta.catatan ?? "dilewati" }, lama);
      return undefined;
    }
    catat({ ...meta, ok: true, jumlah: r.jumlah, diperbarui: new Date().toISOString(), catatan: r.catatan }, lama);
    return r.data;
  } catch (e) {
    catat({ ...meta, ok: false, jumlah: 0, catatan: `gagal: ${(e as Error).message}`.slice(0, 120) }, lama);
    return undefined;
  }
}

const CF = "https://api.cloudflare.com/client/v4/radar";

async function radarGet(path: string, token: string): Promise<unknown> {
  const pemisah = path.includes("?") ? "&" : "?";
  const res = await ambil(`${CF}${path}${pemisah}format=json`, { headers: { Authorization: `Bearer ${token}` } });
  const isi = (await res.json()) as { success?: boolean; errors?: { message?: string }[] };
  if (!res.ok || isi.success === false) throw new Error(isi.errors?.[0]?.message ?? `HTTP ${res.status}`);
  return isi;
}

async function ambilRadar(token: string): Promise<DataRadar> {
  // top/attacks dengan limitDirection=target: pasangan asal -> Indonesia (maks 10 negara asal).
  // Catatan: /top/locations/origin?location=ID di L7 mengabaikan filter target, jadi gak dipakai.
  const q = "location=ID&limitDirection=target&dateRange=7d&limit=10";
  const l7 = await radarGet(`/attacks/layer7/top/attacks?${q}`, token);
  const l3 = await radarGet(`/attacks/layer3/top/attacks?${q}`, token);
  // tren: porsi Indonesia di antara negara target serangan web (L7), per hari, 14 hari terakhir.
  // L3 gak dipakai: porsinya nyaris nol dan lokasinya lokasi data center, bukan negara korban.
  const tren: DataRadar["tren"] = [];
  const now = new Date();
  for (let i = 14; i >= 1; i--) {
    const akhir = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i + 1));
    const mulai = new Date(akhir.getTime() - 86_400_000);
    const qt = `dateStart=${mulai.toISOString().slice(0, 19)}Z&dateEnd=${akhir.toISOString().slice(0, 19)}Z&limit=100`;
    const t: DataRadar["tren"][number] = { tanggal: mulai.toISOString().slice(0, 10) };
    try {
      const a = parseRadarTop(await radarGet(`/attacks/layer7/top/locations/target?${qt}`, token), "target");
      t.porsiL7 = a.find((p) => p.kode === "ID")?.persen ?? 0;
    } catch (e) {
      console.warn("tren L7", t.tanggal, (e as Error).message);
    }
    tren.push(t);
  }
  return { asalL7: parseRadarTop(l7, "origin"), asalL3: parseRadarTop(l3, "origin"), periode: periodeRadar(l7), tren };
}

async function utama() {
  const keluar = arg("keluar", "public/data/ancaman.json")!;
  const lama = await muatLama();
  console.log(lama ? `snapshot lama: ${lama.dibuat}` : "tanpa snapshot lama");

  console.log("memuat DB-IP…");
  const geo = new IndeksGeoIp();
  await bacaGz(await siapkanDbip("city"), (b) => geo.tambahBaris(b));
  const asn = new IndeksAsn();
  await bacaGz(await siapkanDbip("asn"), (b) => asn.tambahBaris(b));
  console.log(`DB-IP: ${geo.ukuran} rentang kota, ${asn.ukuran} rentang ASN`);

  const urlhaus = await cobaSumber(
    { id: "urlhaus", nama: "abuse.ch URLhaus (feed Indonesia)", url: "https://urlhaus.abuse.ch/feeds/country/ID/" },
    lama,
    async () => {
      const d = parseUrlhaus(await teks("https://urlhaus.abuse.ch/feeds/country/ID/"));
      return { data: d, jumlah: d.length };
    },
  );

  const blocklist = await cobaSumber(
    { id: "blocklist", nama: "blocklist.de", url: "https://www.blocklist.de/en/export.html" },
    lama,
    async () => {
      const daftar: DaftarBlocklist[] = [];
      for (const d of DAFTAR_BLOCKLIST) {
        daftar.push({ ...d, ips: parseDaftarIp(await teks(`https://lists.blocklist.de/lists/${d.nama}.txt`)) });
      }
      const semua = parseDaftarIp(await teks("https://lists.blocklist.de/lists/all.txt"));
      return { data: { daftar, semua }, jumlah: semua.length, catatan: "IP penyerang 48 jam terakhir" };
    },
  );

  const feodo = await cobaSumber(
    { id: "feodo", nama: "abuse.ch Feodo Tracker", url: "https://feodotracker.abuse.ch/" },
    lama,
    async () => {
      const d = parseFeodo(await json("https://feodotracker.abuse.ch/downloads/ipblocklist.json"));
      return { data: d, jumlah: d.length };
    },
  );

  const iscPort = await cobaSumber(
    { id: "dshield", nama: "SANS ISC DShield", url: "https://isc.sans.edu/" },
    lama,
    async () => {
      // data hari ini sering masih kosong; pakai kemarin
      const kemarin = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const d = parseIscPort(await json(`https://isc.sans.edu/api/topports/records/10/${kemarin}?json`));
      return d.length ? { data: d, jumlah: d.length, catatan: `sensor global, ${kemarin}` } : null;
    },
  );

  const tokenCf = process.env.CLOUDFLARE_API_TOKEN;
  const radar = await cobaSumber(
    { id: "cloudflare", nama: "Cloudflare Radar", url: "https://radar.cloudflare.com/security/id", catatan: tokenCf ? undefined : "tanpa token" },
    lama,
    async () => {
      if (!tokenCf) return null;
      const d = await ambilRadar(tokenCf);
      return { data: d, jumlah: d.asalL7.length + d.asalL3.length, catatan: "7 hari, persen serangan yang menyasar Indonesia" };
    },
  );

  const kunciAbuse = process.env.ABUSEIPDB_API_KEY;
  const lamaAbuse = lama?.sumber.find((s) => s.id === "abuseipdb");
  const abuseBaru = lamaAbuse?.diperbarui && Date.now() - Date.parse(lamaAbuse.diperbarui) < 6 * 3_600_000;
  const abuse = await cobaSumber(
    {
      id: "abuseipdb",
      nama: "AbuseIPDB",
      url: "https://www.abuseipdb.com/",
      catatan: !kunciAbuse ? "tanpa kunci" : abuseBaru ? "dilewati, kuota 5x/hari" : undefined,
    },
    lama,
    async () => {
      if (!kunciAbuse || abuseBaru) return null;
      const d = parseAbuseBlacklist(
        await json("https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=10000", {
          headers: { Key: kunciAbuse, Accept: "application/json" },
        }),
      );
      return { data: d, jumlah: d.length, catatan: "blacklist, confidence ≥ 90%" };
    },
  );

  const kunciOtx = process.env.OTX_API_KEY;
  const otx = await cobaSumber(
    { id: "otx", nama: "AlienVault OTX", url: "https://otx.alienvault.com/", catatan: kunciOtx ? undefined : "tanpa kunci" },
    lama,
    async () => {
      if (!kunciOtx) return null;
      const h = { headers: { "X-OTX-API-KEY": kunciOtx } };
      const id = new Set<string>();
      for (const q of ["indonesia", "indonesian"]) {
        for (const x of kandidatOtx(await json(`https://otx.alienvault.com/api/v1/search/pulses?q=${q}&sort=-modified&limit=100`, h))) id.add(x);
      }
      const daftar = [...id].slice(0, 60);
      const detail: unknown[] = [];
      for (let i = 0; i < daftar.length; i += 4) {
        const potong = await Promise.all(daftar.slice(i, i + 4).map((x) => json(`https://otx.alienvault.com/api/v1/pulses/${x}?limit=0`, h).catch(() => null)));
        detail.push(...potong);
      }
      const d = parseOtx(detail);
      return { data: d, jumlah: d.length, catatan: `pulse dengan target Indonesia, dari ${daftar.length} kandidat` };
    },
  );

  const ransomware = await cobaSumber(
    { id: "ransomware", nama: "ransomware.live", url: "https://www.ransomware.live/" },
    lama,
    async () => {
      const d = parseRansomware(await json("https://api.ransomware.live/v2/countryvictims/ID"));
      return { data: d, jumlah: d.length, catatan: "klaim korban di situs leak, tanpa nama korban" };
    },
  );

  const bahan: Bahan = {
    sekarang: new Date(),
    sumber: status,
    geo: (ip) => geo.cari(ip),
    asn: (ip) => asn.cari(ip),
    urlhaus,
    blocklist: blocklist?.daftar,
    blocklistSemua: blocklist?.semua,
    feodo,
    iscPort,
    radar,
    abuse: abuse ?? undefined,
    otx,
    ransomware,
    lama,
  };

  const snap = ringkas(bahan);
  mkdirSync(dirname(keluar), { recursive: true });
  writeFileSync(keluar, JSON.stringify(snap));
  console.log(`tulis ${keluar}: ${snap.host.length} host, ${snap.masuk.aliran.length} aliran, ${snap.kampanye.length} kampanye, ${snap.ransomware.length} ransomware`);
}

utama().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Parser murni untuk tiap feed threat intel. Tidak ada akses jaringan di sini, jadi semua bisa dites
 * dengan potongan data asli (tests/unit/parser.test.ts).
 */

import type { Kampanye, Kategori, KorbanRansomware, Porsi } from "../jenis";

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function ipValid(ip: string): boolean {
  return IPV4.test(ip);
}

/** 103.172.186.137 -> 103.172.x.x (IP lengkap gak ditampilkan di UI) */
export function samarkanIp(ip: string): string {
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : "x.x.x.x";
}

/** Pecah satu baris CSV sederhana yang field-nya dikutip ganda. */
export function pecahCsv(baris: string): string[] {
  const keluar: string[] = [];
  let i = 0;
  while (i < baris.length) {
    if (baris[i] === '"') {
      let j = i + 1;
      let isi = "";
      while (j < baris.length) {
        if (baris[j] === '"' && baris[j + 1] === '"') {
          isi += '"';
          j += 2;
        } else if (baris[j] === '"') break;
        else isi += baris[j++];
      }
      keluar.push(isi);
      i = j + 2; // lewati kutip penutup dan koma
    } else {
      const j = baris.indexOf(",", i);
      if (j === -1) {
        keluar.push(baris.slice(i));
        break;
      }
      keluar.push(baris.slice(i, j));
      i = j + 1;
    }
  }
  return keluar;
}

export interface BarisUrlhaus {
  waktu: string;
  status: string;
  ancaman: string;
  ip: string;
  asn: number;
  /** nama berkas terakhir di URL (misal bin.sh), tanpa URL lengkap */
  berkas: string;
}

/** URLhaus country feed: Dateadded (UTC),URL,URL_status,Threat,Host,IPaddress,ASnumber,Country */
export function parseUrlhaus(teks: string): BarisUrlhaus[] {
  const hasil: BarisUrlhaus[] = [];
  for (const mentah of teks.split(/\r?\n/)) {
    const baris = mentah.trim();
    if (!baris || baris.startsWith("#")) continue;
    const f = pecahCsv(baris);
    if (f.length < 8) continue;
    const [tgl, url, status, ancaman, , ip, asn] = f;
    if (!ipValid(ip)) continue;
    const waktu = tgl.replace(" ", "T") + "Z";
    if (Number.isNaN(Date.parse(waktu))) continue;
    const jalur = url.replace(/^[a-z]+:\/\/[^/]+/i, "").split(/[?#]/)[0];
    const berkas = jalur.split("/").filter(Boolean).pop() ?? "";
    hasil.push({ waktu, status, ancaman, ip, asn: Number(asn) || 0, berkas: berkas.slice(0, 40) });
  }
  return hasil;
}

/** Daftar IP polos satu per baris (blocklist.de). Baris komentar dan IPv6 dilewati. */
export function parseDaftarIp(teks: string): string[] {
  const set = new Set<string>();
  for (const b of teks.split(/\r?\n/)) {
    const ip = b.trim();
    if (ipValid(ip)) set.add(ip);
  }
  return [...set];
}

/** Daftar blocklist.de yang dipakai dan kategorinya. */
export const DAFTAR_BLOCKLIST: { nama: string; kategori: Kategori; label: string }[] = [
  { nama: "ssh", kategori: "bruteforce", label: "SSH brute force" },
  { nama: "bruteforcelogin", kategori: "bruteforce", label: "Login brute force (web)" },
  { nama: "imap", kategori: "bruteforce", label: "IMAP/POP3 brute force" },
  { nama: "ftp", kategori: "bruteforce", label: "FTP brute force" },
  { nama: "mail", kategori: "spam", label: "Mail / spam" },
  { nama: "apache", kategori: "web", label: "Web attack (Apache, RFI, exploit)" },
  { nama: "bots", kategori: "botnet", label: "Bot (spam form, scraper)" },
  { nama: "sip", kategori: "scan", label: "SIP / VoIP scan" },
];

export interface BarisFeodo {
  ip: string;
  port: number;
  status: string;
  negara: string;
  asn: number;
  namaAs: string;
  malware: string;
  terakhir: string;
}

export function parseFeodo(json: unknown): BarisFeodo[] {
  if (!Array.isArray(json)) return [];
  const hasil: BarisFeodo[] = [];
  for (const x of json as Record<string, unknown>[]) {
    const ip = String(x.ip_address ?? "");
    if (!ipValid(ip)) continue;
    hasil.push({
      ip,
      port: Number(x.port) || 0,
      status: String(x.status ?? ""),
      negara: String(x.country ?? "").toUpperCase(),
      asn: Number(x.as_number) || 0,
      namaAs: String(x.as_name ?? ""),
      malware: String(x.malware ?? ""),
      terakhir: String(x.last_online ?? x.first_seen ?? ""),
    });
  }
  return hasil;
}

const LAYANAN_PORT: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  81: "HTTP alt",
  110: "POP3",
  123: "NTP",
  135: "MS RPC",
  139: "NetBIOS",
  143: "IMAP",
  161: "SNMP",
  443: "HTTPS",
  445: "SMB",
  1433: "MSSQL",
  1723: "PPTP",
  2222: "SSH alt",
  2323: "Telnet alt",
  3306: "MySQL",
  3389: "RDP",
  5060: "SIP",
  5432: "PostgreSQL",
  5555: "ADB",
  5900: "VNC",
  6379: "Redis",
  7547: "TR-069",
  8000: "HTTP alt",
  8080: "HTTP proxy",
  8443: "HTTPS alt",
  8888: "HTTP alt",
  9200: "Elasticsearch",
  37215: "Huawei HG532",
  52869: "UPnP",
};

export function layananPort(port: number): string {
  return LAYANAN_PORT[port] ?? `port ${port}`;
}

/** DShield /api/topports/records/N/DATE?json -> objek {"0": {...}, "1": {...}, date, limit} */
export function parseIscPort(json: unknown): { port: number; layanan: string; record: number; sumber: number }[] {
  if (!json || typeof json !== "object") return [];
  const hasil = [];
  for (const v of Object.values(json as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const port = Number(o.targetport);
    if (!Number.isInteger(port) || port <= 0) continue;
    hasil.push({ port, layanan: layananPort(port), record: Number(o.records) || 0, sumber: Number(o.sources) || 0 });
  }
  return hasil.sort((a, b) => b.record - a.record);
}

/** Cloudflare Radar top locations: result.<nama>[] dengan originCountryAlpha2/targetCountryAlpha2 + value (persen, string). */
export function parseRadarTop(json: unknown, arah: "origin" | "target"): Porsi[] {
  const r = (json as { result?: Record<string, unknown> })?.result;
  if (!r) return [];
  const daftar = Object.entries(r).find(([k, v]) => k !== "meta" && Array.isArray(v))?.[1] as Record<string, unknown>[] | undefined;
  if (!daftar) return [];
  const kunci = arah === "origin" ? "originCountryAlpha2" : "targetCountryAlpha2";
  return daftar
    .map((x) => ({ kode: String(x[kunci] ?? x.clientCountryAlpha2 ?? "").toUpperCase(), persen: Number(x.value) }))
    .filter((p) => /^[A-Z]{2}$/.test(p.kode) && Number.isFinite(p.persen));
}

/** Periode data dari meta Radar, bila ada. */
export function periodeRadar(json: unknown): { mulai: string; akhir: string } | undefined {
  const meta = (json as { result?: { meta?: { dateRange?: { startTime?: string; endTime?: string }[] | { startTime?: string; endTime?: string } } } })
    ?.result?.meta;
  const dr = Array.isArray(meta?.dateRange) ? meta?.dateRange[0] : meta?.dateRange;
  if (!dr?.startTime || !dr.endTime) return undefined;
  return { mulai: dr.startTime, akhir: dr.endTime };
}

/** AbuseIPDB /api/v2/blacklist -> data[] {ipAddress, countryCode, abuseConfidenceScore, lastReportedAt} */
export function parseAbuseBlacklist(json: unknown): { ip: string; negara: string; skor: number; waktu: string }[] {
  const data = (json as { data?: Record<string, unknown>[] })?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((x) => ({
      ip: String(x.ipAddress ?? ""),
      negara: String(x.countryCode ?? "").toUpperCase(),
      skor: Number(x.abuseConfidenceScore) || 0,
      waktu: String(x.lastReportedAt ?? ""),
    }))
    .filter((x) => ipValid(x.ip));
}

/** Pulse OTX yang isinya feed massal / judi / phishing harian: dilewati sebelum ambil detail. */
export const OTX_BISING = /feed|phish ?destroy|clone|ioc records|domain names|list of malicious|auto-generated|^attack from|unlicensed gambling|^phishing \|/i;

/** id pulse kandidat dari hasil pencarian OTX (sudah dibuang yang bising). */
export function kandidatOtx(json: unknown): string[] {
  const hasil = (json as { results?: Record<string, unknown>[] })?.results;
  if (!Array.isArray(hasil)) return [];
  return hasil.filter((p) => p.id && !OTX_BISING.test(String(p.name ?? ""))).map((p) => String(p.id));
}

/**
 * Detail pulse OTX -> kampanye yang benar-benar mencantumkan Indonesia di targeted_countries.
 * (Hasil pencarian OTX selalu mengosongkan targeted_countries, jadi harus dari endpoint detail.)
 */
export function parseOtx(detail: unknown[]): Kampanye[] {
  const hasil = detail as Record<string, unknown>[];
  if (!Array.isArray(hasil)) return [];
  const nama = (x: unknown) =>
    Array.isArray(x)
      ? x
          .map((m) => (typeof m === "string" ? m : String((m as Record<string, unknown>)?.display_name ?? (m as Record<string, unknown>)?.name ?? "")))
          .filter(Boolean)
      : [];
  const keluar: Kampanye[] = [];
  for (const p of hasil) {
    if (!p || !p.id) continue;
    const negara = nama(p.targeted_countries).map((s) => s.toLowerCase());
    if (!negara.includes("indonesia")) continue;
    keluar.push({
      id: String(p.id),
      judul: String(p.name ?? "").slice(0, 160),
      tanggal: String(p.modified ?? p.created ?? "").slice(0, 10),
      aktor: p.adversary ? String(p.adversary).split(/,\s*/).slice(0, 3).join(", ") : undefined,
      malware: nama(p.malware_families).slice(0, 4),
      industri: nama(p.industries).slice(0, 4),
      url: `https://otx.alienvault.com/pulse/${p.id}`,
    });
  }
  // pulse sering di-clone orang lain dengan judul sama: simpan satu saja (yang terbaru)
  const lihat = new Set<string>();
  return keluar
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .filter((k) => {
      const kunci = k.judul.toLowerCase().trim();
      if (lihat.has(kunci)) return false;
      lihat.add(kunci);
      return true;
    });
}

/**
 * ransomware.live countryvictims -> tanggal, grup, sektor. Nama korban sengaja TIDAK disimpan:
 * daftar korban dipublikasikan geng ransomware untuk memeras, jadi gak perlu ikut disebarkan.
 */
export function parseRansomware(json: unknown): KorbanRansomware[] {
  const arr = Array.isArray(json) ? json : (json as { victims?: unknown[] })?.victims;
  if (!Array.isArray(arr)) return [];
  const hasil: KorbanRansomware[] = [];
  for (const x of arr as Record<string, unknown>[]) {
    const tanggal = String(x.discovered ?? x.attackdate ?? x.published ?? "").slice(0, 10);
    const grup = String(x.group_name ?? x.group ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !grup) continue;
    const sektor = String(x.activity ?? x.sector ?? "").trim();
    hasil.push({ tanggal, grup, sektor: sektor && sektor !== "Not Found" ? sektor : "Tidak diketahui" });
  }
  return hasil.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

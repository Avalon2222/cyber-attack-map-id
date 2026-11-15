import type { Kategori } from "./jenis";
import type { Lang } from "./waktu";

export type { Lang };

const T = {
  tagline: { id: "Siapa yang lagi ngetuk pintu digital Indonesia?", en: "Who's knocking on Indonesia's digital door?" },
  badge: { id: "THREAT INTEL · bukan serangan real-time", en: "THREAT INTEL · not real-time attacks" },
  data: { id: "data", en: "data" },
  memuat: { id: "Menyambung ke feed threat intel…", en: "Connecting to threat intel feeds…" },
  gagal: { id: "Data gak bisa dimuat. Cek koneksi lalu muat ulang.", en: "Couldn't load data. Check your connection and reload." },
  peta_gagal: { id: "Peta butuh WebGL dan koneksi ke tiles.openfreemap.org.", en: "The map needs WebGL and access to tiles.openfreemap.org." },

  asal_judul: { id: "Asal serangan ke Indonesia", en: "Where attacks on Indonesia come from" },
  asal_sub: { id: "porsi request jahat yang diblokir Cloudflare, 7 hari", en: "share of mitigated requests seen by Cloudflare, 7 days" },
  asal_l7: { id: "Web · L7", en: "Web · L7" },
  asal_l3: { id: "DDoS · L3", en: "DDoS · L3" },
  asal_kosong: {
    id: "Data asal serangan (Cloudflare Radar) belum tersambung. Sementara ini yang tampil: host jahat di Indonesia dan kebisingan global.",
    en: "Attack-origin data (Cloudflare Radar) isn't connected yet. For now: malicious hosts in Indonesia and global noise.",
  },
  asal_l3_catatan: {
    id: "DDoS L3: lokasi = data center Cloudflare yang menerima trafik, karena IP sumber DDoS sering dipalsukan.",
    en: "L3 DDoS: location = the Cloudflare data center that received the traffic, since DDoS source IPs are often spoofed.",
  },
  domestik: { id: "dari dalam negeri", en: "from inside Indonesia" },

  feed_judul: { id: "Feed indikator", en: "Indicator feed" },
  feed_sub: { id: "replay dari snapshot · jam = waktu indikator tercatat", en: "replayed from snapshot · time = when the indicator was logged" },
  feed_masuk: { id: "busur", en: "arc" },

  host_judul: { id: "Host jahat di Indonesia", en: "Malicious hosts in Indonesia" },
  host_sub: { id: "IP unik per kategori, posisi level kota (DB-IP)", en: "unique IPs per category, city-level position (DB-IP)" },
  kota_top: { id: "Kota teratas", en: "Top cities" },
  asn_top: { id: "Jaringan (ASN) teratas", en: "Top networks (ASN)" },

  tren_judul: { id: "Tren 30 hari", en: "30-day trend" },
  tren_malware: { id: "URL malware baru di jaringan Indonesia (URLhaus)", en: "New malware URLs hosted in Indonesia (URLhaus)" },
  tren_l7: { id: "Porsi serangan web global yang nyasar Indonesia", en: "Share of global web attacks aimed at Indonesia" },
  tren_l3: { id: "Porsi DDoS L3 global yang nyasar Indonesia", en: "Share of global L3 DDoS aimed at Indonesia" },

  global_judul: { id: "Kebisingan global", en: "Global noise" },
  global_sub: { id: "bukan khusus Indonesia: gambaran internet secara umum", en: "not Indonesia-specific: the internet at large" },
  port_top: { id: "Port paling diserang kemarin (sensor DShield)", en: "Most attacked ports yesterday (DShield sensors)" },
  asal_global: { id: "Negara asal IP penyerang", en: "Countries of attacking IPs" },
  peringkat: { id: "Indonesia peringkat", en: "Indonesia ranks" },
  dari: { id: "dari", en: "of" },
  negara: { id: "negara", en: "countries" },

  kampanye_judul: { id: "Kampanye yang menyebut Indonesia", en: "Campaigns mentioning Indonesia" },
  kampanye_kosong: { id: "Feed AlienVault OTX belum tersambung.", en: "AlienVault OTX feed isn't connected yet." },
  ransom_judul: { id: "Klaim ransomware di Indonesia", en: "Ransomware claims in Indonesia" },
  ransom_sub: { id: "dari situs leak geng ransomware; nama korban sengaja gak ditampilkan", en: "from ransomware leak sites; victim names intentionally hidden" },
  ransom_kosong: { id: "Data ransomware.live belum tersedia di snapshot ini.", en: "ransomware.live data isn't in this snapshot." },
  sektor: { id: "Sektor", en: "Sector" },
  grup: { id: "Grup", en: "Group" },

  bssn_judul: { id: "Angka resmi BSSN", en: "Official BSSN figures" },
  bssn_sub: { id: "anomali trafik yang tercatat sensor BSSN; cakupan sensor berubah tiap tahun", en: "traffic anomalies logged by BSSN sensors; sensor coverage changes yearly" },

  tab_asal: { id: "Asal", en: "Origins" },
  tab_feed: { id: "Feed", en: "Feed" },
  tab_host: { id: "Indonesia", en: "Indonesia" },
  tab_tren: { id: "Tren", en: "Trend" },
  tab_intel: { id: "Intel", en: "Intel" },

  jeda: { id: "Jeda animasi", en: "Pause animation" },
  lanjut: { id: "Lanjutkan animasi", en: "Resume animation" },
  globe: { id: "Globe ↔ datar", en: "Globe ↔ flat" },
  reset: { id: "Kembali ke Indonesia", en: "Back to Indonesia" },
  bahasa: { id: "Ganti bahasa", en: "Switch language" },
  info: { id: "Tentang data", en: "About the data" },
  tutup: { id: "Tutup", en: "Close" },
  panel: { id: "Panel", en: "Panel" },
  filter: { id: "Filter kategori", en: "Category filter" },

  tentang_judul: { id: "Tentang data ini", en: "About this data" },
  jujur_1: {
    id: "Ini peta threat intelligence, bukan rekaman serangan live. Semua angka berasal dari feed publik yang diperbarui otomatis tiap beberapa jam.",
    en: "This is a threat-intelligence map, not a live recording of attacks. Every number comes from public feeds refreshed automatically every few hours.",
  },
  jujur_2: {
    id: "Busur = sampel acak sebanding porsi negara asal di Cloudflare Radar (7 hari). Kalau satu negara 20%, kira-kira 1 dari 5 busur datang dari sana. Busur mendarat di sekitar Jakarta karena datanya cuma level negara.",
    en: "Arcs = random samples weighted by each origin country's share in Cloudflare Radar (7 days). If a country is 20%, roughly 1 in 5 arcs comes from it. Arcs land near Jakarta because the data is country-level only.",
  },
  jujur_3: {
    id: "Negara asal = lokasi IP yang mengirim serangan, belum tentu lokasi pelakunya (VPN, proxy, botnet). Untuk DDoS L3, Cloudflare memakai lokasi data center yang menerima trafik karena IP sumbernya sering dipalsukan.",
    en: "Origin = location of the IP that sent the traffic, not necessarily where the attacker sits (VPNs, proxies, botnets). For L3 DDoS, Cloudflare uses the data center that received the traffic, because source IPs are often spoofed.",
  },
  jujur_4: {
    id: "Titik di Indonesia = IP yang dilaporkan jahat atau terinfeksi (host malware, brute force, spam). Biasanya korban yang perangkatnya dibajak, bukan pelaku. IP disamarkan, posisi kira-kira level kota.",
    en: "Dots in Indonesia = IPs reported as malicious or infected (malware hosting, brute force, spam). Usually hijacked devices, not perpetrators. IPs are masked; positions are approximate, city-level.",
  },
  sumber: { id: "Sumber", en: "Sources" },
  status_ok: { id: "tersambung", en: "connected" },
  status_lama: { id: "pakai data terakhir", en: "using last good data" },
  status_mati: { id: "belum tersambung", en: "not connected" },
  dibuat: { id: "Snapshot dibuat", en: "Snapshot built" },
  lisensi: {
    id: "Geolokasi IP oleh DB-IP (CC BY 4.0). Data Cloudflare Radar CC BY-NC 4.0. Peta © OpenFreeMap, © OpenStreetMap.",
    en: "IP geolocation by DB-IP (CC BY 4.0). Cloudflare Radar data CC BY-NC 4.0. Map © OpenFreeMap, © OpenStreetMap.",
  },
  pintasan: { id: "Spasi jeda · G globe · L bahasa · R reset · I info", en: "Space pause · G globe · L language · R reset · I info" },
  subnet: { id: "IP di subnet ini", en: "IPs in this subnet" },
  terakhir: { id: "terakhir tercatat", en: "last seen" },
} as const;

export type KunciTeks = keyof typeof T;

export function t(k: KunciTeks, lang: Lang): string {
  return T[k][lang];
}

export const LABEL_KATEGORI: Record<Kategori, { id: string; en: string }> = {
  ddos: { id: "DDoS jaringan", en: "Network DDoS" },
  web: { id: "Serangan web", en: "Web attack" },
  bruteforce: { id: "Brute force login", en: "Login brute force" },
  malware: { id: "Host malware", en: "Malware host" },
  botnet: { id: "Botnet / C2", en: "Botnet / C2" },
  scan: { id: "Scan / probe", en: "Scan / probe" },
  spam: { id: "Spam / mail abuse", en: "Spam / mail abuse" },
  laporan: { id: "Dilaporkan jahat", en: "Reported abusive" },
};

export function labelKategori(k: Kategori, lang: Lang): string {
  return LABEL_KATEGORI[k][lang];
}

export const LANG_AWAL: Lang = "id";

import { describe, expect, it } from "vitest";
import { bangunAliran, hashPendek, porsiNegara, ringkas, type Bahan } from "@/lib/pipa/ringkas";
import type { LokasiIp } from "@/lib/pipa/geoip";
import type { Snapshot } from "@/lib/jenis";

const SEKARANG = new Date("2026-11-15T01:00:00Z");

/** GeoIP palsu: 103.x dan 125.x di Indonesia, lainnya di AS. */
function geo(ip: string): LokasiIp | null {
  if (ip.startsWith("103.")) return { negara: "ID", kota: "Bekasi", lon: 106.99, lat: -6.235 };
  if (ip.startsWith("125.")) return { negara: "ID", kota: "Jakarta", lon: 106.846, lat: -6.209 };
  if (ip.startsWith("9.")) return null;
  return { negara: "US" };
}

function bahan(x: Partial<Bahan> = {}): Bahan {
  return { sekarang: SEKARANG, sumber: [], geo, asn: () => ({ asn: 7713, nama: "Telkom" }), ...x };
}

describe("porsiNegara", () => {
  it("persen + peringkat", () => {
    const p = porsiNegara(["US", "US", "ID", "CN"]);
    expect(p.porsi[0]).toEqual({ kode: "US", persen: 50 });
    expect(p.peringkat("ID")).toBeGreaterThan(1);
    expect(p.peringkat("BR")).toBe(0);
  });
});

describe("bangunAliran", () => {
  it("asal Indonesia (domestik) bukan busur, L7 = web, L3 = ddos", () => {
    const a = bangunAliran({
      asalL7: [
        { kode: "ID", persen: 25 },
        { kode: "US", persen: 13 },
      ],
      asalL3: [{ kode: "HU", persen: 34 }],
      tren: [],
    });
    expect(a).toEqual([
      { asal: "US", kategori: "web", persen: 13, sumber: "cloudflare-l7" },
      { asal: "HU", kategori: "ddos", persen: 34, sumber: "cloudflare-l3" },
    ]);
    expect(bangunAliran(undefined)).toEqual([]);
  });
});

describe("ringkas", () => {
  const s = ringkas(
    bahan({
      urlhaus: [
        { waktu: "2026-11-14T22:18:11Z", status: "online", ancaman: "malware_download", ip: "125.161.255.251", asn: 7713, berkas: "i" },
        { waktu: "2026-11-14T10:00:00Z", status: "online", ancaman: "malware_download", ip: "125.161.255.251", asn: 7713, berkas: "bin.sh" },
        { waktu: "2025-01-01T00:00:00Z", status: "offline", ancaman: "malware_download", ip: "125.161.1.1", asn: 7713, berkas: "x" },
        { waktu: "2026-11-13T00:00:00Z", status: "online", ancaman: "malware_download", ip: "8.8.8.8", asn: 15169, berkas: "y" },
      ],
      blocklist: [
        { nama: "ssh", kategori: "bruteforce", label: "SSH brute force", ips: ["103.1.2.3", "103.1.2.4", "103.1.2.5", "8.8.4.4", "9.9.9.9"] },
        { nama: "mail", kategori: "spam", label: "Mail", ips: ["103.1.2.3"] },
      ],
      blocklistSemua: ["103.1.2.3", "8.8.4.4", "8.8.8.8", "1.1.1.1"],
      feodo: [{ ip: "125.1.1.1", port: 443, status: "online", negara: "ID", asn: 7713, namaAs: "TELKOM", malware: "QakBot", terakhir: "2026-11-10" }],
      iscPort: [{ port: 22, layanan: "SSH", record: 10, sumber: 2 }],
    }),
  );

  it("cuma host Indonesia, dikelompokkan per /24 + kategori + sumber", () => {
    const brute = s.host.filter((h) => h.kategori === "bruteforce");
    expect(brute).toHaveLength(1);
    expect(brute[0]).toMatchObject({ ip: "103.1.x.x", jumlah: 3, kota: "Bekasi", sumber: "blocklist.de" });
    expect(s.host.some((h) => h.ip.startsWith("8."))).toBe(false);
  });

  it("URLhaus lebih dari 30 hari dibuang, URL dobel satu IP dihitung sekali", () => {
    const mal = s.host.filter((h) => h.kategori === "malware");
    expect(mal).toHaveLength(1);
    expect(mal[0].jumlah).toBe(1);
    expect(mal[0].waktu).toBe("2026-11-14T22:18:11Z");
  });

  it("IP asli gak bocor ke snapshot", () => {
    expect(JSON.stringify(s)).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });

  it("agregat kategori, kota, ASN", () => {
    expect(s.kategori.find((k) => k.kategori === "bruteforce")?.jumlah).toBe(3);
    expect(s.kategori.find((k) => k.kategori === "botnet")?.jumlah).toBe(1);
    expect(s.kota[0].kota).toBe("Bekasi");
    expect(s.asn[0]).toMatchObject({ asn: 7713, nama: "Telkom" });
  });

  it("tren 30 hari dengan hitungan URL malware baru", () => {
    expect(s.tren).toHaveLength(30);
    expect(s.tren[s.tren.length - 1].tanggal).toBe("2026-11-15");
    expect(s.tren.find((t) => t.tanggal === "2026-11-14")?.malwareBaru).toBe(2);
  });

  it("sebaran asal global dari blocklist.de + peringkat Indonesia", () => {
    expect(s.globalAsal[0].kode).toBe("US");
    expect(s.peringkatID).toMatchObject({ posisi: 2, jumlah: 1, sumber: "blocklist.de" });
  });

  it("tanpa Radar: aliran kosong", () => {
    expect(s.masuk.aliran).toEqual([]);
  });
});

describe("carry-over saat sumber gagal", () => {
  const lama: Snapshot = {
    versi: 1,
    dibuat: "2026-11-14T00:00:00Z",
    sumber: [],
    masuk: { aliran: [{ asal: "US", kategori: "web", persen: 10, sumber: "cloudflare-l7" }], asalL7: [{ kode: "US", persen: 10 }], asalL3: [] },
    tren: [{ tanggal: "2026-11-10", porsiL7: 0.2, malwareBaru: 4 }],
    host: [{ id: "a", ip: "103.9.x.x", lon: 1, lat: 1, kota: "X", kategori: "laporan", sumber: "abuseipdb", jumlah: 1, waktu: "2026-11-14T00:00:00Z" }],
    kota: [],
    kategori: [],
    asn: [{ asn: 1, nama: "Lama", jumlah: 1 }],
    globalPort: [{ port: 23, layanan: "Telnet", record: 1, sumber: 1 }],
    globalAsal: [{ kode: "CN", persen: 40 }],
    peringkatID: { posisi: 5, dari: 100, jumlah: 9, sumber: "abuseipdb" },
    kampanye: [{ id: "k", judul: "K", tanggal: "2026-11-01", malware: [], industri: [], url: "u" }],
    ransomware: [{ tanggal: "2026-11-01", grup: "g", sektor: "s" }],
  };
  const s = ringkas(bahan({ lama }));

  it("Radar, OTX, ransomware, port, dan host AbuseIPDB lama dipertahankan", () => {
    expect(s.masuk).toEqual(lama.masuk);
    expect(s.kampanye).toEqual(lama.kampanye);
    expect(s.ransomware).toEqual(lama.ransomware);
    expect(s.globalPort).toEqual(lama.globalPort);
    expect(s.host.map((h) => h.id)).toEqual(["a"]);
    expect(s.peringkatID?.sumber).toBe("abuseipdb");
    expect(s.tren.find((t) => t.tanggal === "2026-11-10")).toMatchObject({ porsiL7: 0.2, malwareBaru: 4 });
  });
});

describe("hashPendek", () => {
  it("stabil dan pendek", () => {
    expect(hashPendek("abc")).toBe(hashPendek("abc"));
    expect(hashPendek("abc")).not.toBe(hashPendek("abd"));
    expect(hashPendek("103.1.2|bruteforce|blocklist.de").length).toBeLessThanOrEqual(7);
  });
});

describe("ekspor CSV", () => {
  it("tiga tabel, tanpa IP, kutip aman", async () => {
    const { snapshotKeCsv } = await import("@/lib/pipa/csv");
    const s = ringkas(
      bahan({
        blocklist: [{ nama: "ssh", kategori: "bruteforce", label: "SSH", ips: ["103.1.2.3"] }],
        radar: { asalL7: [{ kode: "US", persen: 13.14 }], asalL3: [{ kode: "HU", persen: 34.5 }], tren: [], periode: { mulai: "2026-11-08T01:00:00Z", akhir: "2026-11-15T01:00:00Z" } },
      }),
    );
    const csv = snapshotKeCsv(s);
    expect(Object.keys(csv)).toEqual(["asal_serangan.csv", "host_indonesia.csv", "tren_harian.csv"]);
    expect(csv["asal_serangan.csv"]).toContain("web_l7,US,Amerika Serikat,13.14,2026-11-08,2026-11-15");
    expect(csv["host_indonesia.csv"].split("\n")[1]).toMatch(/^Bekasi,-6.235,106.99,bruteforce,blocklist.de,1,7713,2026-11-15$/);
    expect(Object.values(csv).join("")).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });
});

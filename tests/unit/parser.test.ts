import { describe, expect, it } from "vitest";
import {
  ipValid,
  kandidatOtx,
  layananPort,
  parseAbuseBlacklist,
  parseDaftarIp,
  parseFeodo,
  parseIscPort,
  parseOtx,
  parseRadarTop,
  parseRansomware,
  parseUrlhaus,
  pecahCsv,
  periodeRadar,
  samarkanIp,
} from "@/lib/pipa/parser";

describe("util IP", () => {
  it("validasi IPv4", () => {
    expect(ipValid("103.172.186.137")).toBe(true);
    expect(ipValid("256.1.1.1")).toBe(false);
    expect(ipValid("1.2.3")).toBe(false);
    expect(ipValid("2001:db8::1")).toBe(false);
  });
  it("menyamarkan dua oktet terakhir", () => {
    expect(samarkanIp("103.172.186.137")).toBe("103.172.x.x");
    expect(samarkanIp("rusak")).toBe("x.x.x.x");
  });
});

describe("pecahCsv", () => {
  it("menangani kutip, koma di dalam kutip, dan kutip ganda", () => {
    expect(pecahCsv('"a","b,c","d""e"')).toEqual(["a", "b,c", 'd"e']);
    expect(pecahCsv("1.0.0.0,1.0.0.255,OC,AU,Queensland,\"South Brisbane\",-27.4767,153.017")).toEqual([
      "1.0.0.0",
      "1.0.0.255",
      "OC",
      "AU",
      "Queensland",
      "South Brisbane",
      "-27.4767",
      "153.017",
    ]);
  });
});

const URLHAUS = `##########
# URLhaus Country CSV Feed
# Dateadded (UTC),URL,URL_status,Threat,Host,IPaddress,ASnumber,Country
"2026-11-14 22:18:11","http://125.161.255.251:57395/i","online","malware_download","125.161.255.251","125.161.255.251","7713","ID"
"2026-11-14 12:44:11","http://103.172.186.137:50916/bin.sh?x=1","online","malware_download","103.172.186.137","103.172.186.137","142400","ID"
"2018-03-24 16:03:58","http://dprk.example.go.id/WIRE-FORM/","offline","malware_download","dprk.example.go.id","222.124.8.102","7713","ID"
"rusak","http://x","online","malware_download","x","bukan-ip","1","ID"
`;

describe("parseUrlhaus", () => {
  const r = parseUrlhaus(URLHAUS);
  it("melewati komentar dan baris rusak", () => {
    expect(r).toHaveLength(3);
  });
  it("mengambil waktu UTC, ASN, dan nama berkas tanpa URL/query", () => {
    expect(r[0]).toMatchObject({ waktu: "2026-11-14T22:18:11Z", ip: "125.161.255.251", asn: 7713, berkas: "i", status: "online" });
    expect(r[1].berkas).toBe("bin.sh");
    expect(r[2].berkas).toBe("WIRE-FORM");
  });
});

describe("parseDaftarIp", () => {
  it("dedup, buang IPv6 dan sampah", () => {
    expect(parseDaftarIp("1.1.1.1\n1.1.1.1\n2001:db8::1\n# komentar\n8.8.8.8\r\n")).toEqual(["1.1.1.1", "8.8.8.8"]);
  });
});

describe("parseFeodo", () => {
  it("mengambil kolom penting dan menolak non-array", () => {
    const d = parseFeodo([
      { ip_address: "50.16.16.211", port: 443, status: "online", country: "us", as_number: 14618, as_name: "AMAZON-AES", malware: "QakBot", last_online: "2026-03-12" },
      { ip_address: "bukan" },
    ]);
    expect(d).toEqual([{ ip: "50.16.16.211", port: 443, status: "online", negara: "US", asn: 14618, namaAs: "AMAZON-AES", malware: "QakBot", terakhir: "2026-03-12" }]);
    expect(parseFeodo({})).toEqual([]);
  });
});

describe("parseIscPort", () => {
  it("mengurutkan port dan memberi nama layanan", () => {
    const d = parseIscPort({
      "0": { rank: 1, targetport: 22, records: 100, targets: 3, sources: 9 },
      "1": { rank: 2, targetport: 23, records: 200, targets: 3, sources: 8 },
      date: "2026-11-14",
      limit: 10,
    });
    expect(d.map((x) => x.port)).toEqual([23, 22]);
    expect(d[0].layanan).toBe("Telnet");
    expect(layananPort(40404)).toBe("port 40404");
  });
});

describe("Cloudflare Radar", () => {
  const top = {
    success: true,
    result: {
      top_0: [
        { originCountryAlpha2: "US", targetCountryAlpha2: "ID", value: "13.14", rank: 1 },
        { originCountryAlpha2: "XX1", value: "1" },
        { originCountryAlpha2: "NL", value: "bukan angka" },
      ],
      meta: { dateRange: [{ startTime: "2026-11-08T01:00:00Z", endTime: "2026-11-15T01:00:00Z" }] },
    },
  };
  it("parse porsi asal dan target", () => {
    expect(parseRadarTop(top, "origin")).toEqual([{ kode: "US", persen: 13.14 }]);
    expect(parseRadarTop(top, "target")).toEqual([{ kode: "ID", persen: 13.14 }]);
    expect(parseRadarTop({}, "origin")).toEqual([]);
  });
  it("periode dari meta", () => {
    expect(periodeRadar(top)).toEqual({ mulai: "2026-11-08T01:00:00Z", akhir: "2026-11-15T01:00:00Z" });
    expect(periodeRadar({ result: {} })).toBeUndefined();
  });
});

describe("AbuseIPDB", () => {
  it("parse blacklist", () => {
    const d = parseAbuseBlacklist({ data: [{ ipAddress: "1.2.3.4", countryCode: "id", abuseConfidenceScore: 100, lastReportedAt: "2026-11-15T00:00:00+00:00" }, { ipAddress: "::1" }] });
    expect(d).toEqual([{ ip: "1.2.3.4", negara: "ID", skor: 100, waktu: "2026-11-15T00:00:00+00:00" }]);
  });
});

describe("OTX", () => {
  it("kandidat membuang feed massal, judi, dan phishing harian", () => {
    const ids = kandidatOtx({
      results: [
        { id: "a", name: "Indonesian Banking Sector Threat Landscape" },
        { id: "b", name: "PhishDestroy — Active Phishing" },
        { id: "c", name: "Unlicensed gambling operator: contoh.com" },
        { id: "d", name: "Phishing | Nov 15, 2026 | Part 1/5" },
        { id: "e", name: "Malware Domain Feed V2" },
      ],
    });
    expect(ids).toEqual(["a"]);
  });
  it("hanya pulse dengan target Indonesia, dedup judul, urut terbaru", () => {
    const k = parseOtx([
      { id: "1", name: "Hirudo", modified: "2026-11-13T00:00:00", targeted_countries: ["India", "Indonesia"], industries: ["Finance"], malware_families: [{ display_name: "Hirudo" }] },
      { id: "2", name: "Hirudo", modified: "2026-11-01T00:00:00", targeted_countries: ["Indonesia"] },
      { id: "3", name: "Lain", modified: "2026-11-14T00:00:00", targeted_countries: ["Brazil"] },
      { id: "4", name: "APT", modified: "2026-10-01T00:00:00", targeted_countries: ["Indonesia"], adversary: "A, B, C, D" },
      null,
    ]);
    expect(k.map((x) => x.id)).toEqual(["1", "4"]);
    expect(k[0]).toMatchObject({ industri: ["Finance"], malware: ["Hirudo"], url: "https://otx.alienvault.com/pulse/1", tanggal: "2026-11-13" });
    expect(k[1].aktor).toBe("A, B, C");
  });
});

describe("parseRansomware", () => {
  it("menyimpan tanggal, grup, sektor tapi tidak nama korban", () => {
    const d = parseRansomware([
      { post_title: "PT Rahasia", group_name: "lockbit3", discovered: "2026-11-01 10:00:00", activity: "Manufacturing" },
      { post_title: "Korban 2", group_name: "akira", discovered: "2026-11-05", activity: "Not Found" },
      { post_title: "rusak", group_name: "", discovered: "2026-11-05" },
    ]);
    expect(d).toEqual([
      { tanggal: "2026-11-05", grup: "akira", sektor: "Tidak diketahui" },
      { tanggal: "2026-11-01", grup: "lockbit3", sektor: "Manufacturing" },
    ]);
    expect(JSON.stringify(d)).not.toContain("Rahasia");
  });
});

import { describe, expect, it } from "vitest";
import { IndeksAsn, IndeksGeoIp, ipKeAngka } from "@/lib/pipa/geoip";

describe("ipKeAngka", () => {
  it("konversi dan tolak input rusak", () => {
    expect(ipKeAngka("0.0.0.1")).toBe(1);
    expect(ipKeAngka("1.0.0.0")).toBe(16777216);
    expect(ipKeAngka("255.255.255.255")).toBe(4294967295);
    expect(ipKeAngka("1.2.3")).toBe(-1);
    expect(ipKeAngka("1.2.3.999")).toBe(-1);
  });
});

describe("IndeksGeoIp", () => {
  const g = new IndeksGeoIp(2);
  for (const b of [
    "0.0.0.0,0.255.255.255,ZZ,ZZ,,,0,0",
    '1.0.0.0,1.0.0.255,OC,AU,Queensland,"South Brisbane",-27.4767,153.017',
    "1.178.19.0,1.178.19.255,AS,ID,Jakarta,Jakarta,-6.20876,106.846",
    "2001:db8::,2001:db8::ffff,EU,DE,,,0,0",
    "103.172.186.0,103.172.186.255,AS,ID,Jawa Barat,Bekasi,-6.235,106.99",
  ])
    g.tambahBaris(b);

  it("melewati ZZ dan IPv6, tumbuh melebihi kapasitas awal", () => {
    expect(g.ukuran).toBe(3);
  });
  it("negara lain cuma kode negara, Indonesia lengkap dengan kota", () => {
    expect(g.cari("1.0.0.7")).toEqual({ negara: "AU" });
    expect(g.cari("103.172.186.137")).toEqual({ negara: "ID", provinsi: "Jawa Barat", kota: "Bekasi", lat: -6.235, lon: 106.99 });
  });
  it("IP di luar rentang -> null", () => {
    expect(g.cari("9.9.9.9")).toBeNull();
    expect(g.cari("bukan")).toBeNull();
  });
});

describe("IndeksAsn", () => {
  const a = new IndeksAsn();
  a.tambahBaris('1.0.0.0,1.0.0.255,13335,"Cloudflare, Inc."');
  a.tambahBaris('125.160.0.0,125.167.255.255,7713,"Telekomunikasi Indonesia (PT)"');
  it("cari ASN dan nama organisasi", () => {
    expect(a.cari("125.161.255.251")).toEqual({ asn: 7713, nama: "Telekomunikasi Indonesia (PT)" });
    expect(a.namaAsn(13335)).toBe("Cloudflare, Inc.");
    expect(a.cari("8.8.8.8")).toBeNull();
  });
});

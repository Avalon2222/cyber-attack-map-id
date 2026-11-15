/**
 * Angka resmi BSSN (Badan Siber dan Sandi Negara) soal anomali trafik di Indonesia, dikutip dari laporan/rilis
 * yang diberitakan media. Ditulis tangan karena BSSN tidak menyediakan API. Cakupan sensor dan metode BSSN
 * berubah antar tahun, jadi angka antar tahun jangan dibandingkan mentah-mentah.
 */

export interface AngkaBssn {
  periode: { id: string; en: string };
  anomali: number;
  catatan?: { id: string; en: string };
  sumber: string;
}

export const ANGKA_BSSN: AngkaBssn[] = [
  {
    periode: { id: "2022 (setahun)", en: "2022 (full year)" },
    anomali: 976_429_996,
    sumber: "https://teknologi.bisnis.com/read/20240627/84/1777561/ri-kebanjiran-9141-juta-trafik-anomali-60-aktivitas-malware",
  },
  {
    periode: { id: "2023 (setahun)", en: "2023 (full year)" },
    anomali: 403_990_813,
    catatan: { id: "jenis terbanyak: Generic Trojan RAT", en: "top type: Generic Trojan RAT" },
    sumber: "https://csirt.kemenpora.go.id/wp-content/uploads/2025/02/keamanan.pdf",
  },
  {
    periode: { id: "Jan–Agu 2024", en: "Jan–Aug 2024" },
    anomali: 122_790_000,
    catatan: { id: "59,26% aktivitas malware", en: "59.26% malware activity" },
    sumber: "https://infobanknews.com/ngeri-ada-12279-juta-serangan-siber-ke-ri-sektor-ini-target-utamanya/",
  },
  {
    periode: { id: "1 Jan–15 Nov 2025", en: "1 Jan–15 Nov 2025" },
    anomali: 5_200_000_000,
    catatan: { id: "±182 per detik, 93,78% berbasis malware", en: "≈182 per second, 93.78% malware-based" },
    sumber: "https://investortrust.id/business/100269/bssn-sebut-5-2-miliar-anomali-trafik-jadi-ancaman-siber-sektor-keungan-paling-rentan",
  },
];

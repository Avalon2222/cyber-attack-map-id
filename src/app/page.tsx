import KonsolKlien from "@/components/KonsolKlien";

export default function Halaman() {
  return (
    <>
      {/* judul + ringkasan ikut di HTML server, jadi mesin pencari dan pembaca layar tetap dapat isinya */}
      <h1 className="sr-only">Cyber Attack Map ID: peta ancaman siber yang menyasar Indonesia</h1>
      <p className="sr-only">
        Peta threat intelligence dari feed publik: negara asal serangan ke Indonesia (Cloudflare Radar), host jahat dan
        terinfeksi di jaringan Indonesia (URLhaus, blocklist.de, Feodo Tracker, AbuseIPDB), tren 30 hari, kampanye
        AlienVault OTX, klaim ransomware, dan angka resmi BSSN. Bukan rekaman serangan real-time.
      </p>
      <KonsolKlien />
    </>
  );
}

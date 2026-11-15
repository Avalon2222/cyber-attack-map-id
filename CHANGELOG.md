# Changelog

Semua perubahan penting di Cyber Attack Map ID dicatat di sini. Formatnya mengikuti
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versinya [Semantic Versioning](https://semver.org/).
Tiap versi baru di `package.json` otomatis jadi tag + GitHub Release lewat workflow `rilis.yml`.

## [1.0.0] - 2026-11-15

Rilis pertama.

### Ditambah
- Globe MapLibre dengan busur serangan animasi ke Indonesia, bobotnya dari porsi negara asal di Cloudflare Radar
  (web L7 dan DDoS L3, 7 hari).
- Host jahat/terinfeksi di jaringan Indonesia dari URLhaus, blocklist.de, Feodo Tracker, dan AbuseIPDB, posisi level
  kota dari DB-IP, IP disamarkan, dikelompokkan per subnet /24.
- Feed indikator, tren 30 hari, kebisingan global (DShield, sebaran negara penyerang), kampanye AlienVault OTX yang
  menyasar Indonesia, klaim ransomware per sektor (tanpa nama korban), dan angka resmi BSSN.
- Snapshot otomatis tiap ~2 jam ke cabang `data` lewat GitHub Actions, dengan carry-over kalau satu sumber down.
- Dua bahasa (ID/EN), pintasan keyboard, dites di 360, 390, 412, dan 1440 px.

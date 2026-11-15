/**
 * Header keamanan untuk semua halaman (dipasang lewat next.config.ts).
 * Host baru yang diambil browser (ubin peta, data) harus didaftarkan di SUMBER_LUAR, kalau gak diblokir CSP.
 */

export const SUMBER_LUAR = {
  sambung: ["https://tiles.openfreemap.org", "https://raw.githubusercontent.com"],
  gambar: ["https://tiles.openfreemap.org"],
};

export function kebijakanKonten(dev = false): string {
  const aturan: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...SUMBER_LUAR.gambar]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", "data:", "blob:", ...SUMBER_LUAR.sambung, ...(dev ? ["ws:"] : [])]],
    ["worker-src", ["'self'", "blob:"]],
    ["child-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];
  return aturan.map(([nama, nilai]) => `${nama} ${nilai.join(" ")}`).join("; ");
}

export function headerKeamanan(dev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: kebijakanKonten(dev) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ];
}

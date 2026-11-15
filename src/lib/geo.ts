/** Geometri bola sederhana: jarak, interpolasi lingkaran besar. */

export const R_BUMI_KM = 6371.0088;
const RAD = Math.PI / 180;

export function jarakKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_BUMI_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Titik-titik di lingkaran besar dari a ke b (inklusif), n segmen.
 * Bujur dibuat kontinu (tanpa loncatan ±180) supaya garis mercator gak nyebrang peta.
 */
export function lingkaranBesar(a: [number, number], b: [number, number], n = 64): [number, number][] {
  const [lo1, la1] = [a[0] * RAD, a[1] * RAD];
  const [lo2, la2] = [b[0] * RAD, b[1] * RAD];
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2)));
  const hasil: [number, number][] = [];
  if (d < 1e-9) {
    for (let i = 0; i <= n; i++) hasil.push([a[0], a[1]]);
    return hasil;
  }
  let lonLama = a[0];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    const lat = Math.atan2(z, Math.hypot(x, y)) / RAD;
    let lon = Math.atan2(y, x) / RAD;
    while (lon - lonLama > 180) lon -= 360;
    while (lon - lonLama < -180) lon += 360;
    lonLama = lon;
    hasil.push([lon, lat]);
  }
  return hasil;
}

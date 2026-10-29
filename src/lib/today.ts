/**
 * Satu-satunya "hari ini" untuk logika bisnis di seluruh aplikasi demo: 26 Okt 2026 (WIB).
 * Jangan memakai new Date() untuk menentukan tanggal bisnis (status pegawai, masa kerja, saldo cuti,
 * kontrak ≤ 45 hari, pengecekan periode); impor DEMO_TODAY dari sini.
 */
export const DEMO_TODAY = '2026-10-26'

/** Jam:menit WIB saat ini, hanya untuk cap waktu tampilan (bukan untuk logika tanggal). */
export function nowTimeWIB() {
  const parts = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { hh: get('hour').replace('24', '00'), mm: get('minute') }
}

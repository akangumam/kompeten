/**
 * Headcount aktif per bulan: satu sumber untuk Dashboard › Tren Karyawan Aktif dan perhitungan turnover.
 * Angka awal tahun tidak boleh diturunkan terpisah dari seri ini.
 */
export const HEADCOUNT: Record<number, (number | null)[]> = {
  2024: [198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209],
  2025: [210, 212, 214, 215, 216, 218, 219, 220, 220, 221, 222, 224],
  2026: [226, 229, 231, 234, 236, 239, 241, 243, 246, 248, null, null],
}
/** Headcount akhir bulan (1–12); null bila belum ada data. */
export const headcountAt = (year: number, month: number) => HEADCOUNT[year]?.[month - 1] ?? null
/** Headcount awal tahun = 31 Desember tahun sebelumnya. */
export const headcountStart = (year: number) => headcountAt(year - 1, 12)

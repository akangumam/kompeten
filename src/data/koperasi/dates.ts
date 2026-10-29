/** Utilitas tanggal ISO (yyyy-mm-dd) untuk modul Koperasi; semua perhitungan di UTC agar tidak bergeser zona. */
const pad = (n: number) => String(n).padStart(2, '0')
export const ym = (iso: string) => iso.slice(0, 7)
export const firstOfMonth = (iso: string) => `${ym(iso)}-01`
/** Tambah n bulan pada tanggal 1 bulan tersebut. */
export function addMonths(iso: string, n: number) {
  const [y, m] = iso.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}-01`
}
export const lastDayOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number)
  return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
}
/** Selisih bulan penuh dari a ke b (b setelah a). */
export const monthsBetween = (a: string, b: string) => {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma) - (db < da ? 1 : 0)
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const monthLabel = (iso: string) => `${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

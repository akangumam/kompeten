import { ALL, type DirFilters, type DirTab } from '@/data/directory'
import { DEMO_TODAY } from '@/lib/today'
import { SHIFT_DEFS } from '@/data/master/shifts'
import { formatDate } from '@/lib/format'

const NOUN: Record<DirTab, string> = {
  aktif: 'pegawai aktif',
  bergabung: 'pegawai yang akan bergabung',
  draft: 'draft pegawai',
  nonaktif: 'pegawai nonaktif',
}

/** Kalimat ringkasan dinamis di atas tabel (PRD §9). */
export function summarize(f: DirFilters, n: number, kontrak: number) {
  const x = f.extra
  const shift = SHIFT_DEFS.find((s) => s.id === x.shift)
  let s = `Menampilkan ${n.toLocaleString('id-ID')} ${NOUN[f.tab]}`
  if (f.department !== ALL) s += ` di Department ${f.department}${f.section !== ALL ? ` · Section ${f.section}` : ''}`
  if (x.divisi) s += ` di ${x.divisi}`
  if (f.jenis !== ALL) s += ` berjenis ${f.jenis}`
  if (f.statusKerja !== ALL) s += ` dengan status ${f.statusKerja}`
  if (f.level !== ALL) s += ` pada level ${f.level}`
  if (x.posisi) s += ` dengan posisi ${x.posisi}`
  if (x.grade) s += ` pada grade ${x.grade}`
  if (shift) s += ` pada shift ${shift.nama}`
  if (x.pola) s += ` dengan pola ${x.pola} hari kerja`
  if (f.pensiun) s += ' yang mendekati pensiun (≤ 6 bulan)'
  if (f.kontrak45) s += ' yang kontraknya berakhir dalam 45 hari'
  if (f.q) s += ` dengan kata kunci “${f.q}”`
  s += ` per ${formatDate(DEMO_TODAY)}`
  if ((f.tab === 'aktif' || f.tab === 'bergabung') && !f.kontrak45 && kontrak > 0)
    s += ` (termasuk ${kontrak} pegawai yang kontraknya berakhir dalam 45 hari)`
  return s + '.'
}

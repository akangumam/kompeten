import { addDayIso, contractEnd } from '@/data/contracts'
import { makanAt, transportAt, tunjanganAt } from '@/data/payroll/components'
import { gradeRange } from '@/data/payroll/salaries'
import { masaPenawaran } from '@/data/master/recruitment'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { bump } from './store'

export type OfferStatus = 'Draft' | 'Menunggu Approval' | 'Disetujui' | 'Dikirim' | 'Diterima kandidat' | 'Ditolak kandidat' | 'Kedaluwarsa'
export type Respon = { jenis: 'Menerima' | 'Menolak' | 'Negosiasi'; tanggal: string; by: string; file?: { name: string; size: number }; alasan?: string }
export type Offer = {
  id: string
  kandidatId: string
  versi: number
  /** OL/HRD-PPI/{nnn}/{bulan romawi}/{tahun}. */
  olNo: string
  posisi: string
  level: string
  grade: string
  jenis: string
  statusKerja: string
  durasi: number
  tanggalMulai: string
  gajiPokok: number
  tunjangan: number
  makan: number
  transport: number
  benefit: string
  /** Wajib bila Gaji Pokok di luar rentang Grade. */
  justifikasi?: string
  status: OfferStatus
  diajukan?: { by: string; at: string }
  disetujui?: { by: string; at: string }
  dikembalikan?: { by: string; at: string; alasan: string }
  dikirim?: { tanggal: string; batas: string; by: string }
  respon?: Respon
  riwayat: { at: string; label: string; by: string }[]
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
let olSeq = 13
export function nextOlNo(date: string = DEMO_TODAY) {
  const [y, m] = date.split('-').map(Number)
  olSeq += 1
  return `OL/HRD-PPI/${String(olSeq).padStart(3, '0')}/${ROMAWI[m - 1]}/${y}`
}
/** Nomor yang akan dipakai penawaran berikutnya (untuk pratinjau). */
export const olNoFor = (seq: number, date: string) => {
  const [y, m] = date.split('-').map(Number)
  return `OL/HRD-PPI/${String(seq).padStart(3, '0')}/${ROMAWI[m - 1]}/${y}`
}

let idSeq = 3
export const OFFERS: Offer[] = []
export const offerOf = (id?: string) => (id ? OFFERS.find((o) => o.id === id) : undefined)
export const offerByKandidat = (kandidatId: string) => OFFERS.find((o) => o.kandidatId === kandidatId)

export const effOfferStatus = (o: Offer): OfferStatus => (o.status === 'Dikirim' && o.dikirim && DEMO_TODAY > o.dikirim.batas ? 'Kedaluwarsa' : o.status)
export const tanggalAkhir = (o: Pick<Offer, 'statusKerja' | 'tanggalMulai' | 'durasi'>) => (o.statusKerja === 'Kontrak' && o.tanggalMulai && o.durasi > 0 ? contractEnd(o.tanggalMulai, o.durasi) : '')

/** Pesan peringatan bila Gaji Pokok di luar rentang Grade; kosong bila sesuai. */
export function rangeWarning(grade: string, gaji: number): string {
  const g = gradeRange(grade)
  if (!g || !gaji) return ''
  return gaji < g.min || gaji > g.max ? `Di luar rentang Grade ${grade}: Rp ${g.min.toLocaleString('id-ID')} – Rp ${g.max.toLocaleString('id-ID')}` : ''
}

export type OfferInput = Pick<Offer, 'posisi' | 'level' | 'grade' | 'jenis' | 'statusKerja' | 'durasi' | 'tanggalMulai' | 'gajiPokok' | 'benefit' | 'justifikasi'>
export function newOffer(kandidatId: string, base: OfferInput, by: string): Offer {
  const o: Offer = {
    id: `OFR-${++idSeq}`, kandidatId, versi: 1, olNo: nextOlNo(), ...base,
    tunjangan: tunjanganAt(base.level, DEMO_TODAY), makan: makanAt(DEMO_TODAY), transport: transportAt(DEMO_TODAY),
    status: 'Draft', riwayat: [{ at: DEMO_TODAY, label: 'Penawaran dibuat (Draft)', by }],
  }
  OFFERS.push(o)
  bump()
  return o
}
export function updateOffer(id: string, patch: OfferInput, by: string) {
  const o = offerOf(id)
  if (!o || o.status !== 'Draft') return
  Object.assign(o, patch, { tunjangan: tunjanganAt(patch.level, DEMO_TODAY), makan: makanAt(DEMO_TODAY), transport: transportAt(DEMO_TODAY) })
  o.riwayat.push({ at: DEMO_TODAY, label: 'Penawaran diubah', by })
  bump()
}
export function submitOffer(id: string, by: string) {
  const o = offerOf(id)
  if (!o || o.status !== 'Draft') return
  o.status = 'Menunggu Approval'
  o.diajukan = { by, at: DEMO_TODAY }
  o.dikembalikan = undefined
  o.riwayat.push({ at: DEMO_TODAY, label: `Penawaran versi ${o.versi} diajukan`, by })
  bump()
}
export function approveOffer(id: string, by: string) {
  const o = offerOf(id)
  if (!o || o.status !== 'Menunggu Approval') return
  o.status = 'Disetujui'
  o.disetujui = { by, at: DEMO_TODAY }
  o.riwayat.push({ at: DEMO_TODAY, label: 'Penawaran disetujui', by })
  bump()
}
export function returnOffer(id: string, by: string, alasan: string) {
  const o = offerOf(id)
  if (!o || o.status !== 'Menunggu Approval') return
  o.status = 'Draft'
  o.dikembalikan = { by, at: DEMO_TODAY, alasan }
  o.riwayat.push({ at: DEMO_TODAY, label: `Penawaran ditolak approver: ${alasan}`, by })
  bump()
}
export function sendOffer(id: string, by: string) {
  const o = offerOf(id)
  if (!o) return
  const s = effOfferStatus(o)
  if (s !== 'Disetujui' && s !== 'Kedaluwarsa') return
  o.status = 'Dikirim'
  o.dikirim = { tanggal: DEMO_TODAY, batas: addDayIso(DEMO_TODAY, masaPenawaran(DEMO_TODAY)), by }
  o.riwayat.push({ at: DEMO_TODAY, label: `Penawaran dikirim ke kandidat (batas jawab ${formatDate(o.dikirim.batas)})`, by })
  bump()
}

export function acceptOffer(id: string, date: string, file: { name: string; size: number }, by: string) {
  const o = offerOf(id)
  if (!o || effOfferStatus(o) !== 'Dikirim') return
  o.status = 'Diterima kandidat'
  o.respon = { jenis: 'Menerima', tanggal: date, by, file }
  o.riwayat.push({ at: date, label: 'Kandidat menerima penawaran', by })
  bump()
}

export function declineOffer(id: string, date: string, alasan: string, by: string) {
  const o = offerOf(id)
  if (!o || effOfferStatus(o) !== 'Dikirim') return
  o.status = 'Ditolak kandidat'
  o.respon = { jenis: 'Menolak', tanggal: date, by, alasan }
  o.riwayat.push({ at: date, label: `Kandidat menolak penawaran: ${alasan}`, by })
  bump()
}

/* ---------- seed (riwayat penawaran) ---------- */
const seed = (o: Omit<Offer, 'tunjangan' | 'makan' | 'transport' | 'riwayat' | 'versi'> & { riwayat: Offer['riwayat'] }) => {
  OFFERS.push({ versi: 1, tunjangan: tunjanganAt(o.level, DEMO_TODAY), makan: makanAt(DEMO_TODAY), transport: transportAt(DEMO_TODAY), ...o })
}
seed({
  id: 'OFR-1', kandidatId: 'LMR-2026-0143', olNo: 'OL/HRD-PPI/009/X/2026', posisi: 'Operator Injection', level: 'Operator', grade: 'G1', jenis: 'Organik', statusKerja: 'Kontrak', durasi: 12,
  tanggalMulai: '2026-11-02', gajiPokok: 5_300_000, benefit: 'BPJS Kesehatan dan Ketenagakerjaan, seragam kerja.', status: 'Diterima kandidat',
  diajukan: { by: 'Okta Maulana', at: '2026-10-02' }, disetujui: { by: 'Lestari Wulandari', at: '2026-10-02' }, dikirim: { tanggal: '2026-10-03', batas: '2026-10-06', by: 'Okta Maulana' },
  respon: { jenis: 'Menerima', tanggal: '2026-10-06', by: 'Okta Maulana', file: { name: 'OL_009_Andi_Saputra_ttd.pdf', size: 540_000 } },
  riwayat: [{ at: '2026-10-02', label: 'Penawaran dibuat dan diajukan', by: 'Okta Maulana' }, { at: '2026-10-02', label: 'Penawaran disetujui', by: 'Lestari Wulandari' }, { at: '2026-10-03', label: 'Penawaran dikirim ke kandidat (batas jawab 6 Okt 2026)', by: 'Okta Maulana' }, { at: '2026-10-06', label: 'Kandidat menerima penawaran', by: 'Okta Maulana' }],
})
seed({
  id: 'OFR-2', kandidatId: 'LMR-2026-0144', olNo: 'OL/HRD-PPI/011/X/2026', posisi: 'QC Inspector', level: 'Operator', grade: 'G1', jenis: 'Organik', statusKerja: 'Kontrak', durasi: 12,
  tanggalMulai: '2026-11-02', gajiPokok: 5_500_000, benefit: 'BPJS Kesehatan dan Ketenagakerjaan, seragam kerja.', status: 'Diterima kandidat',
  diajukan: { by: 'Okta Maulana', at: '2026-10-08' }, disetujui: { by: 'Lestari Wulandari', at: '2026-10-08' }, dikirim: { tanggal: '2026-10-09', batas: '2026-10-12', by: 'Okta Maulana' },
  respon: { jenis: 'Menerima', tanggal: '2026-10-15', by: 'Okta Maulana', file: { name: 'OL_011_Rina_Marlina_ttd.pdf', size: 612_000 } },
  riwayat: [{ at: '2026-10-08', label: 'Penawaran dibuat dan diajukan', by: 'Okta Maulana' }, { at: '2026-10-08', label: 'Penawaran disetujui', by: 'Lestari Wulandari' }, { at: '2026-10-09', label: 'Penawaran dikirim ke kandidat (batas jawab 12 Okt 2026)', by: 'Okta Maulana' }, { at: '2026-10-15', label: 'Kandidat menerima penawaran', by: 'Okta Maulana' }],
})
seed({
  id: 'OFR-3', kandidatId: 'LMR-2026-0146', olNo: 'OL/HRD-PPI/013/X/2026', posisi: 'Admin PPIC', level: 'Staff', grade: 'G3', jenis: 'Organik', statusKerja: 'Kontrak', durasi: 12,
  tanggalMulai: '2026-11-16', gajiPokok: 6_200_000, benefit: 'BPJS Kesehatan dan Ketenagakerjaan, seragam kerja.', status: 'Menunggu Approval',
  diajukan: { by: 'Okta Maulana', at: '2026-10-26' },
  riwayat: [{ at: '2026-10-26', label: 'Penawaran versi 1 diajukan', by: 'Okta Maulana' }],
})

import { can } from '@/lib/access'
import { useSyncExternalStore } from 'react'
import { nowStamp } from '@/data/attendance'
import { addDayIso, contractEnd } from '@/data/contracts'
import { ROSTER } from '@/data/employees'
import { spValidityMonths, violationName } from '@/data/master/discipline'
import type { CurrentUser } from '@/data/users'
import { DEMO_TODAY } from '@/lib/today'
import { validAlasan, ALASAN_ERROR } from '@/lib/validators'

/**
 * Disiplin: Teguran Lisan, Teguran Tertulis, SP1, SP2, SP3, dan Surat Panggilan adalah catatan terpisah.
 * SP tidak pernah naik tingkat otomatis; sistem hanya menyarankan tingkat berikutnya bila SP sebelumnya masih aktif.
 */
export type DiscJenis = 'Teguran Lisan' | 'Teguran Tertulis' | 'SP1' | 'SP2' | 'SP3' | 'Surat Panggilan'
export const DISC_JENIS: DiscJenis[] = ['Teguran Lisan', 'Teguran Tertulis', 'SP1', 'SP2', 'SP3', 'Surat Panggilan']
export const DISC_NOTE: Record<DiscJenis, string> = {
  'Teguran Lisan': 'Dicatat saja, tanpa surat',
  'Teguran Tertulis': 'Surat teguran, berlaku sesuai master',
  SP1: 'Surat Peringatan pertama',
  SP2: 'Surat Peringatan kedua',
  SP3: 'Surat Peringatan ketiga',
  'Surat Panggilan': 'Untuk mangkir, bukan sanksi',
}
/** Tingkat sanksi untuk perbandingan; Surat Panggilan bukan sanksi. */
export const LEVEL: Partial<Record<DiscJenis, number>> = { 'Teguran Lisan': 0, 'Teguran Tertulis': 1, SP1: 2, SP2: 3, SP3: 4 }
const SP_ONLY: DiscJenis[] = ['SP1', 'SP2', 'SP3']

export type DiscStatus = 'menunggu' | 'aktif' | 'kedaluwarsa' | 'ditolak' | 'dibatalkan'
export const DISC_STATUS_LABEL: Record<DiscStatus, string> = { menunggu: 'Menunggu Approval', aktif: 'Aktif', kedaluwarsa: 'Kedaluwarsa', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan' }

export type Disc = {
  id: string
  nik: string
  jenis: DiscJenis
  /** Kode Jenis Pelanggaran (master). */
  pelanggaran: string
  kejadian: string
  kronologi: string
  lampiran?: string
  /** Pasal PP/PKB yang dikutip (teks yang dapat diubah). */
  pasal: string
  catatanLevel?: string
  panggilan?: { ke: 1 | 2; hadir: string; tanggapan?: 'hadir' | 'tidak-hadir' }
  /** Status tersimpan; Kedaluwarsa dihitung dari tanggal berlaku (lihat `statusOf`). */
  status: 'menunggu' | 'aktif' | 'ditolak' | 'dibatalkan'
  diajukan: { by: string; at: string; tanggal: string; nik?: string }
  step?: { person: string; status: 'menunggu' | 'disetujui' | 'ditolak'; by?: string; at?: string; alasan?: string }
  keputusan?: { by: string; at: string; alasan?: string }
  terbit?: string
  berlakuSampai?: string
  suratNo: string
  tandaTerima?: { tanggal?: string; menolak?: boolean; saksi?: string; oleh: string; at: string }
}

export const DEFAULT_PASAL: Record<DiscJenis, string> = {
  'Teguran Lisan': '',
  'Teguran Tertulis': 'Pasal 12 ayat (1) Peraturan Perusahaan tentang tata tertib kerja',
  SP1: 'Pasal 12 ayat (2) Peraturan Perusahaan tentang sanksi disiplin tingkat pertama',
  SP2: 'Pasal 12 ayat (3) Peraturan Perusahaan tentang sanksi disiplin tingkat kedua',
  SP3: 'Pasal 12 ayat (4) Peraturan Perusahaan tentang sanksi disiplin tingkat ketiga',
  'Surat Panggilan': 'Pasal 14 Peraturan Perusahaan tentang kewajiban hadir dan mangkir',
}

/* ---------- store ---------- */
let version = 0
const subs = new Set<() => void>()
export const bump = () => {
  version++
  subs.forEach((f) => f())
}
export const useDiscipline = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )

export const DISC: Disc[] = []
const SEQ = { id: 3, sp: 17, spg: 0 }
const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const pad3 = (n: number) => String(n).padStart(3, '0')
const seriesOf = (j: DiscJenis) => (j === 'Surat Panggilan' ? 'SPG' : 'SP')
export const letterNumber = (series: 'SP' | 'SPG', n: number, tanggal: string) => `${series}/HRD-PPI/${pad3(n)}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tanggal.slice(0, 4)}`
export const nextLetterNo = (j: DiscJenis) => letterNumber(seriesOf(j), (j === 'Surat Panggilan' ? SEQ.spg : SEQ.sp) + 1, DEMO_TODAY)
export const hasLetter = (j: DiscJenis) => j !== 'Teguran Lisan'

/* ---------- turunan ---------- */
export const validUntil = (terbit: string) => contractEnd(terbit, spValidityMonths(terbit))
export function statusOf(d: Disc): DiscStatus {
  if (d.status === 'aktif' && d.berlakuSampai && d.berlakuSampai < DEMO_TODAY) return 'kedaluwarsa'
  return d.status
}
export const isActive = (d: Disc) => statusOf(d) === 'aktif'
const mine = (nik: string) => DISC.filter((d) => d.nik === nik)

/** SP aktif tertinggi pegawai dan saran tingkat berikutnya (tidak otomatis). */
export function activeSp(nik: string): { disc: Disc; next: DiscJenis | null } | null {
  const act = mine(nik).filter((d) => isActive(d) && SP_ONLY.includes(d.jenis)).sort((a, b) => (LEVEL[b.jenis] ?? 0) - (LEVEL[a.jenis] ?? 0))[0]
  if (!act) return null
  return { disc: act, next: act.jenis === 'SP1' ? 'SP2' : act.jenis === 'SP2' ? 'SP3' : null }
}
export const activeSp3 = (nik: string) => mine(nik).find((d) => d.jenis === 'SP3' && isActive(d))
export const panggilanCount = (nik: string) => mine(nik).filter((d) => d.jenis === 'Surat Panggilan' && (d.status === 'menunggu' || d.status === 'aktif')).length
/** Panggilan yang diterbitkan dan tidak ditanggapi: tidak hadir tercatat, atau batas hadir sudah lewat tanpa kehadiran. */
export const unansweredPanggilan = (nik: string) =>
  mine(nik).filter((d) => d.jenis === 'Surat Panggilan' && d.status === 'aktif' && d.panggilan && d.panggilan.tanggapan !== 'hadir' && (d.panggilan.tanggapan === 'tidak-hadir' || d.panggilan.hadir < DEMO_TODAY))
export const isOpenPanggilan = (d: Disc) => d.jenis === 'Surat Panggilan' && d.status === 'aktif' && d.panggilan?.tanggapan !== 'hadir' && d.panggilan?.tanggapan !== 'tidak-hadir' && (d.panggilan?.hadir ?? '') >= DEMO_TODAY

/* ---------- akses ---------- */
/** Catatan disiplin hanya untuk HR Development & Industrial, HR & GA Manager, dan atasan langsung pegawai. */
export function canSeeDisc(d: Pick<Disc, 'nik'>, user: CurrentUser): boolean {
  if (can(user, 'ir.discipline-view') && user.role !== 'supervisor') return true
  return user.role === 'supervisor' && empOf(d.nik)?.atasanId === user.nik
}
export const canSeeDiscipline = (nik: string, user: CurrentUser) => canSeeDisc({ nik }, user)
export const canCreateDisc = (user: CurrentUser) => can(user, 'ir.manage') || user.role === 'supervisor'
export const canReviewDisc = (d: Disc, user: CurrentUser) => d.status === 'menunggu' && user.role === 'manager' && d.diajukan.by !== user.nama && d.nik !== 'manager'
export const canCancelDisc = (d: Disc, user: CurrentUser) => can(user, 'ir.manage') && (d.status === 'menunggu' || d.status === 'aktif') && statusOf(d) !== 'kedaluwarsa'
export const canReceipt = (d: Disc, user: CurrentUser) => can(user, 'ir.manage') && hasLetter(d.jenis) && (d.status === 'aktif') && !d.tandaTerima
export const eligibleForCreate = (user: CurrentUser) => ROSTER.filter((e) => e.tanggalMasuk <= DEMO_TODAY && (user.role !== 'supervisor' || e.atasanId === user.nik))

/* ---------- membuat ---------- */
export type DiscInput = {
  nik: string
  jenis: DiscJenis | ''
  pelanggaran: string
  kejadian: string
  kronologi: string
  lampiran?: string
  pasal: string
  catatanLevel?: string
  hadir?: string
}
export function validateDisc(i: DiscInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.nik) e.nik = 'Pegawai wajib dipilih'
  if (!i.jenis) e.jenis = 'Jenis wajib dipilih'
  if (!i.pelanggaran) e.pelanggaran = 'Jenis pelanggaran wajib dipilih'
  if (!i.kejadian) e.kejadian = 'Tanggal kejadian wajib diisi'
  else if (i.kejadian > DEMO_TODAY) e.kejadian = 'Tanggal kejadian tidak boleh setelah hari ini'
  if (i.kronologi.trim().length < 20 || /^[\d\s.,-]+$/.test(i.kronologi.trim())) e.kronologi = 'Kronologi minimal 20 karakter dan jelas'
  if (i.nik && i.jenis) {
    const act = activeSp(i.nik)
    const lvl = LEVEL[i.jenis as DiscJenis]
    if (act && lvl !== undefined && lvl > 0 && lvl <= (LEVEL[act.disc.jenis] ?? 0) && !validAlasan(i.catatanLevel ?? '')) e.catatanLevel = `Tingkat ${i.jenis} tidak lebih tinggi dari ${act.disc.jenis} yang aktif. ${ALASAN_ERROR}`
    if (i.jenis === 'Surat Panggilan') {
      if (panggilanCount(i.nik) >= 2) e.jenis = 'Sudah ada dua Surat Panggilan. Lanjutkan dengan Proses Keluar alasan Mangkir.'
      if (!i.hadir) e.hadir = 'Batas hadir wajib diisi'
      else if (i.hadir <= DEMO_TODAY) e.hadir = 'Batas hadir harus setelah hari ini'
    }
  }
  return e
}
export function createDisc(i: DiscInput, actor: CurrentUser): { id?: string; errors?: Record<string, string> } {
  const errors = validateDisc(i)
  if (Object.keys(errors).length) return { errors }
  const jenis = i.jenis as DiscJenis
  SEQ.id += 1
  const base: Disc = {
    id: `DSC-2026-${String(SEQ.id).padStart(4, '0')}`,
    nik: i.nik,
    jenis,
    pelanggaran: i.pelanggaran,
    kejadian: i.kejadian,
    kronologi: i.kronologi.trim(),
    lampiran: i.lampiran,
    pasal: i.pasal.trim(),
    catatanLevel: i.catatanLevel?.trim() || undefined,
    panggilan: jenis === 'Surat Panggilan' ? { ke: (panggilanCount(i.nik) + 1) as 1 | 2, hadir: i.hadir! } : undefined,
    status: 'menunggu',
    diajukan: { by: actor.nama, at: nowStamp(), tanggal: DEMO_TODAY, nik: actor.nik },
    step: { person: 'Lestari Wulandari', status: 'menunggu' },
    suratNo: '',
  }
  // Teguran Lisan hanya dicatat: tanpa surat dan tanpa approval.
  if (jenis === 'Teguran Lisan') Object.assign(base, { status: 'aktif', step: undefined, terbit: DEMO_TODAY, berlakuSampai: validUntil(DEMO_TODAY) })
  DISC.unshift(base)
  bump()
  return { id: base.id }
}

export function approveDisc(id: string, actor: CurrentUser) {
  const d = DISC.find((x) => x.id === id)
  if (!d || !canReviewDisc(d, actor)) return
  d.status = 'aktif'
  d.step = { ...d.step!, status: 'disetujui', by: actor.nama, at: nowStamp() }
  d.keputusan = { by: actor.nama, at: nowStamp() }
  d.terbit = DEMO_TODAY
  if (d.jenis === 'Surat Panggilan') {
    SEQ.spg += 1
    d.suratNo = letterNumber('SPG', SEQ.spg, DEMO_TODAY)
    d.berlakuSampai = d.panggilan!.hadir
  } else {
    SEQ.sp += 1
    d.suratNo = letterNumber('SP', SEQ.sp, DEMO_TODAY)
    d.berlakuSampai = validUntil(DEMO_TODAY)
  }
  bump()
}
export function rejectDisc(id: string, actor: CurrentUser, alasan: string) {
  const d = DISC.find((x) => x.id === id)
  if (!d || !canReviewDisc(d, actor)) return
  d.status = 'ditolak'
  d.step = { ...d.step!, status: 'ditolak', by: actor.nama, at: nowStamp(), alasan }
  d.keputusan = { by: actor.nama, at: nowStamp(), alasan }
  bump()
}
export function cancelDisc(id: string, actor: CurrentUser, alasan: string) {
  const d = DISC.find((x) => x.id === id)
  if (!d || !canCancelDisc(d, actor)) return
  d.status = 'dibatalkan'
  d.keputusan = { by: actor.nama, at: nowStamp(), alasan }
  bump()
}
export function recordReceipt(id: string, input: { tanggal?: string; menolak?: boolean; saksi?: string; tanggapan?: 'hadir' | 'tidak-hadir' }, actor: CurrentUser): string {
  const d = DISC.find((x) => x.id === id)
  if (!d || !canReceipt(d, actor)) return 'Tidak dapat mencatat tanda terima'
  if (input.menolak) {
    if (!input.saksi?.trim()) return 'Nama saksi wajib diisi bila pegawai menolak tanda tangan'
  } else if (!input.tanggal) return 'Tanggal diterima wajib diisi'
  else if (input.tanggal < (d.terbit ?? '') || input.tanggal > DEMO_TODAY) return 'Tanggal diterima antara tanggal terbit dan hari ini'
  d.tandaTerima = { tanggal: input.menolak ? undefined : input.tanggal, menolak: input.menolak, saksi: input.menolak ? input.saksi!.trim() : undefined, oleh: actor.nama, at: nowStamp() }
  if (d.panggilan && input.tanggapan) d.panggilan.tanggapan = input.tanggapan
  bump()
  return ''
}

/* ---------- KPI ---------- */
export const visible = (user: CurrentUser) => DISC.filter((d) => canSeeDisc(d, user))
export function discKpi(list: Disc[]) {
  return {
    spAktif: list.filter((d) => SP_ONLY.includes(d.jenis) && isActive(d)).length,
    menunggu: list.filter((d) => d.status === 'menunggu').length,
    kedaluwarsa30: list.filter((d) => isActive(d) && hasLetter(d.jenis) && d.jenis !== 'Surat Panggilan' && d.berlakuSampai! >= DEMO_TODAY && d.berlakuSampai! <= addDayIso(DEMO_TODAY, 30)).length,
    panggilan: list.filter(isOpenPanggilan).length,
  }
}
export const disciplineOf = (nik: string) => mine(nik).filter((d) => d.status !== 'ditolak').sort((a, b) => (b.terbit ?? b.diajukan.tanggal).localeCompare(a.terbit ?? a.diajukan.tanggal))
export const violationOf = (d: Disc) => violationName(d.pelanggaran)
export const usedViolation = (kode: string) => DISC.filter((d) => d.pelanggaran === kode).length

/* ---------- seed ---------- */
function seed() {
  const ADM = 'Teddy Syahputra'
  const sp1Terbit = '2026-09-02'
  const byName = (n: string) => ROSTER.find((e) => e.nama === n)!.nik
  DISC.push(
    {
      id: 'DSC-2026-0003', nik: byName('Arif Rahman'), jenis: 'SP1', pelanggaran: 'PLG-04', kejadian: '2026-10-22',
      kronologi: 'Kedapatan merokok di area produksi pada 22 Okt 2026 pukul 10.15, sesuai laporan Supervisor Produksi dan rekaman CCTV.',
      pasal: DEFAULT_PASAL.SP1, status: 'menunggu', diajukan: { by: ADM, at: '24 Okt 2026, 11.20 WIB', tanggal: '2026-10-24' },
      step: { person: 'Lestari Wulandari', status: 'menunggu' }, suratNo: '',
    },
    {
      id: 'DSC-2026-0002', nik: byName('Fitri Handayani'), jenis: 'Teguran Tertulis', pelanggaran: 'PLG-03', kejadian: '2026-04-10',
      kronologi: 'Tidak memakai APD (sepatu safety dan masker) saat berada di area produksi pada inspeksi 10 Apr 2026.',
      pasal: DEFAULT_PASAL['Teguran Tertulis'], status: 'aktif', diajukan: { by: ADM, at: '11 Apr 2026, 09.30 WIB', tanggal: '2026-04-11' },
      step: { person: 'Lestari Wulandari', status: 'disetujui', by: 'Lestari Wulandari', at: '13 Apr 2026, 14.00 WIB' },
      keputusan: { by: 'Lestari Wulandari', at: '13 Apr 2026, 14.00 WIB' }, terbit: '2026-04-14', berlakuSampai: contractEnd('2026-04-14', 6),
      suratNo: letterNumber('SP', 9, '2026-04-14'), tandaTerima: { tanggal: '2026-04-15', oleh: ADM, at: '15 Apr 2026, 08.45 WIB' },
    },
    {
      id: 'DSC-2026-0001', nik: byName('Agung Wibowo'), jenis: 'SP1', pelanggaran: 'PLG-01', kejadian: '2026-09-01',
      kronologi: 'Terlambat berulang: 6 kali dalam periode September 2026 menurut Absensi Harian, tanpa Izin Terlambat yang disetujui.',
      pasal: DEFAULT_PASAL.SP1, status: 'aktif', diajukan: { by: 'Teguh Santoso', at: '1 Sep 2026, 16.00 WIB', tanggal: '2026-09-01' },
      step: { person: 'Lestari Wulandari', status: 'disetujui', by: 'Lestari Wulandari', at: '2 Sep 2026, 09.10 WIB' },
      keputusan: { by: 'Lestari Wulandari', at: '2 Sep 2026, 09.10 WIB' }, terbit: sp1Terbit, berlakuSampai: contractEnd(sp1Terbit, 6),
      suratNo: letterNumber('SP', 17, sp1Terbit), tandaTerima: { tanggal: '2026-09-03', oleh: ADM, at: '3 Sep 2026, 08.30 WIB' },
    },
  )
}
seed()

import { useSyncExternalStore } from 'react'
import { nowStamp } from '@/data/attendance'
import { addDayIso } from '@/data/contracts'
import { activeSp3, unansweredPanggilan } from '@/data/discipline'
import { CONTRACT_ENDING, ROSTER, SUPERVISORS } from '@/data/employees'
import { balanceOf } from '@/data/koperasi/ledger'
import { KASBON, LOANS, sisaOf } from '@/data/koperasi/loans'
import { isAnggota, memberOf } from '@/data/koperasi/members'
import { bump as bumpKoperasi } from '@/data/koperasi/store'
import { EXIT_REASONS, MANGKIR } from '@/data/master/exit-reasons'
import { nearRetirement, retirementDate } from '@/data/master/retirement'
import { membershipAt, saveMembership } from '@/data/payroll/bpjs-membership'
import { birthOf, EXITED } from '@/data/profiles'
import { registeredAssets } from '@/data/assets'
import { headcountAt, headcountStart } from '@/data/headcount'
import { lastContract } from '@/data/contracts'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

/**
 * Pegawai Keluar: pegawai hanya keluar lewat catatan offboarding. Tanggal keluar = hari kerja terakhir;
 * pegawai Nonaktif sehari setelahnya. Perhitungan pesangon dan hak akhir dibuat di tahap berikutnya (09d).
 */
export const REASON_START = ['Mengundurkan Diri', 'Pensiun', 'Meninggal Dunia', 'PHK Efisiensi', 'PHK Kompetensi', 'PHK Pelanggaran', MANGKIR] as const
export const ALL_REASONS = ['Habis Kontrak', ...REASON_START] as const
export type OffReason = (typeof ALL_REASONS)[number]
export const turnoverFlag = (reason: string) => EXIT_REASONS.find((x) => x.nama === reason)?.turnover ?? true

export type ClearKey = 'aset' | 'akses' | 'serah' | 'koperasi' | 'dokumen'
export type ClearStatus = 'Belum' | 'Berjalan' | 'Selesai' | 'Dikecualikan'
export type ClearItem = { key: ClearKey; label: string; pic: string; status: ClearStatus; tanggal?: string; catatan?: string; kecuali?: { alasan: string; oleh: string } }
export type Interview = {
  alasanUtama: string
  ratings: { atasan: number; rekan: number; beban: number; kompensasi: number; lingkungan: number }
  saran: string
  rehire: 'Ya' | 'Tidak'
  rehireCatatan: string
  oleh: string
  at: string
}
export const RATING_LABEL: Record<keyof Interview['ratings'], string> = { atasan: 'Atasan', rekan: 'Rekan kerja', beban: 'Beban kerja', kompensasi: 'Kompensasi', lingkungan: 'Lingkungan kerja' }
export const ALASAN_UTAMA = ['Kesempatan karier di tempat lain', 'Kompensasi', 'Beban kerja', 'Hubungan dengan atasan', 'Lingkungan kerja', 'Alasan keluarga atau pribadi', 'Kontrak tidak diperpanjang', 'Pensiun', 'Lainnya']

export type OffStatus = 'berjalan' | 'selesai' | 'dibatalkan'
export type Off = {
  no: string
  nik: string
  reason: OffReason
  tanggalKeluar: string
  tanggalSurat?: string
  dokumen?: string
  ahliWaris?: string
  dasar?: string
  mendesak?: boolean
  /** PHK Efisiensi: kondisi perusahaan (menentukan pengali Hak Akhir). */
  kondisi?: 'rugi' | 'cegah'
  pasal?: string
  spNo?: string
  catatanTanggal?: string
  keterangan: string
  status: OffStatus
  diajukan: { by: string; at: string; tanggal: string }
  approval: { status: 'menunggu' | 'disetujui' | 'ditolak'; by?: string; at?: string; alasan?: string; warning30?: boolean }
  clearance: ClearItem[]
  interview?: Interview
  hakAkhirOk: boolean
  /** Potongan kewajiban Koperasi dari hak akhir (input untuk modul Kompensasi). Dikelola Bendahara. */
  koperasi?: { keputusan: 'lunas' | 'potong' | 'tunai'; potongan: number; oleh: string; at: string }
  selesai?: { by: string; at: string }
  skkNo: string
  dibatalkan?: { by: string; at: string; alasan: string }
}

/* ---------- store ---------- */
let version = 0
const subs = new Set<() => void>()
export const bump = () => {
  version++
  subs.forEach((f) => f())
}
export const useOffboarding = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )
export const OFFS: Off[] = []

/** Dipasang modul Hak Akhir (finalpay.ts): status catatan Hak Akhir dan pembuatan otomatis saat offboarding disetujui. */
export type HakStatusKey = 'hitung' | 'menunggu' | 'disetujui' | 'dibayar'
export const hakHook: { statusOf: (offNo: string) => HakStatusKey | undefined; onApproved: (o: Off) => void } = { statusOf: () => undefined, onApproved: () => {} }
const hakDone = (o: Off) => {
  const s = hakHook.statusOf(o.no)
  return s === undefined || s === 'disetujui' || s === 'dibayar'
}
const SEQ = { off: 4, skk: 11 }
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const skkNumber = (n: number, tanggal: string) => `SKK/HRD-PPI/${String(n).padStart(3, '0')}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tanggal.slice(0, 4)}`
export const nextSkkNo = () => skkNumber(SEQ.skk + 1, DEMO_TODAY)

export type Person = { nik: string; nama: string; department: string; section: string; posisi: string; statusKerja: string; jenis: string; tanggalMasuk: string; atasanId?: string }
export function personOf(nik: string): Person | undefined {
  const e = ROSTER.find((x) => x.nik === nik) ?? EXITED.find((x) => x.nik === nik)
  return e ? { nik: e.nik, nama: e.nama, department: e.department, section: e.section ?? '', posisi: e.posisi, statusKerja: e.statusKerja, jenis: e.jenis ?? 'Organik', tanggalMasuk: e.tanggalMasuk, atasanId: e.atasanId } : undefined
}
export const offOf = (nik: string) => OFFS.find((o) => o.nik === nik && o.status !== 'dibatalkan')
export const activeOff = (nik: string) => OFFS.find((o) => o.nik === nik && o.status === 'berjalan')

/** Aset yang dipegang pegawai: dibaca dari tab Aset profil bila sudah berisi; bila kosong, daftar bawaan dari department dan level. */
export function assetsOf(nik: string): string[] {
  const registered = registeredAssets(nik)
  if (registered.length) return registered
  const e = ROSTER.find((x) => x.nik === nik)
  if (!e) return []
  const out = ['ID card', 'Kunci loker']
  if (['Produksi', 'Quality Assurance', 'Maintenance', 'Warehouse'].includes(e.department)) out.push('Seragam kerja', 'Sepatu safety')
  if (['IT', 'Finance', 'Engineering', 'HR & GA', 'PPIC', 'Purchasing'].includes(e.department) || ['Supervisor', 'Manager'].includes(e.level)) out.push('Laptop kantor')
  return out
}

/** Kewajiban Koperasi anggota: kasbon + pinjaman Koperasi; pinjaman Non-Koperasi dipisah (bukan dana koperasi). */
export function koperasiBalance(nik: string) {
  const b = balanceOf(nik)
  const kasbon = KASBON.filter((k) => k.nik === nik && ['dicairkan', 'ditagihkan', 'tertahan'].includes(k.status)).reduce((a, k) => a + k.nominal, 0)
  const pinjaman = LOANS.filter((l) => l.nik === nik && l.jenis === 'koperasi' && l.status === 'aktif').reduce((a, l) => a + sisaOf(l), 0)
  const non = LOANS.filter((l) => l.nik === nik && l.jenis === 'non' && l.status === 'aktif')
  return { pokok: b.Pokok, wajib: b.Wajib, sukarela: b.Sukarela, saldo: b.Pokok + b.Wajib + b.Sukarela, kasbon, pinjaman, kewajiban: kasbon + pinjaman, nonN: non.length, nonSisa: non.reduce((a, l) => a + sisaOf(l), 0) }
}

/* ---------- status pegawai ---------- */
const doneOffs = () => OFFS.filter((o) => o.status === 'selesai')
/** Nonaktif sejak sehari setelah tanggal keluar. */
export const hasLeft = (nik: string, date: string = DEMO_TODAY) => doneOffs().some((o) => o.nik === nik && o.tanggalKeluar < date)
export const scheduledExit = (nik: string) => doneOffs().find((o) => o.nik === nik && o.tanggalKeluar >= DEMO_TODAY)
export const exitRecord = (nik: string) => doneOffs().find((o) => o.nik === nik)

function syncContractEnding() {
  for (const k of Object.keys(CONTRACT_ENDING)) delete CONTRACT_ENDING[k]
  for (const o of OFFS) {
    if (o.reason !== 'Habis Kontrak' || o.status === 'dibatalkan') continue
    CONTRACT_ENDING[o.nik] = o.approval.status === 'menunggu' ? 'diajukan' : 'diproses'
  }
}

/* ---------- akses ---------- */
export const canStartOff = (user: CurrentUser) => user.role === 'admin'
export function canSeeOff(o: Off, user: CurrentUser) {
  if (user.role === 'admin' || user.role === 'manager' || user.role === 'payroll') return true
  return user.role === 'supervisor' && personOf(o.nik)?.atasanId === user.nik
}
/** Isi exit interview dan Eligible for Rehire hanya untuk Admin HRD dan HR & GA Manager. */
export const canSeeInterview = (user: CurrentUser) => user.role === 'admin' || user.role === 'manager'
export const canReviewOff = (o: Off, user: CurrentUser) => o.status === 'berjalan' && o.approval.status === 'menunggu' && user.role === 'manager' && o.diajukan.by !== user.nama
export const canCancelOff = (o: Off, user: CurrentUser) => user.role === 'admin' && o.status === 'berjalan'

/* ---------- validasi ---------- */
export type OffInput = {
  nik: string
  reason: OffReason | ''
  tanggalKeluar: string
  tanggalSurat?: string
  dokumen?: string
  ahliWaris?: string
  dasar?: string
  mendesak?: boolean
  kondisi?: 'rugi' | 'cegah'
  pasal?: string
  catatanTanggal?: string
  keterangan: string
}
export type OffPreview = { person?: Person; tanggalKeluar: string; errors: Record<string, string>; warnings: string[]; blocked?: string; readOnlyDate: boolean; spNo?: string }
const addDays30 = (iso: string) => addDayIso(iso, 30)

export function defaultKeluar(nik: string, reason: string): string {
  const e = ROSTER.find((x) => x.nik === nik)
  if (!e) return ''
  if (reason === 'Habis Kontrak') return lastContract(nik)?.akhir ?? e.tanggalAkhir ?? ''
  if (reason === 'Pensiun') return retirementDate(birthOf(e))
  return ''
}

export function previewOff(i: OffInput): OffPreview {
  const person = personOf(i.nik)
  const errors: Record<string, string> = {}
  const warnings: string[] = []
  let blocked: string | undefined
  let spNo: string | undefined
  const reason = i.reason
  const readOnlyDate = reason === 'Habis Kontrak'
  let keluar = i.tanggalKeluar
  const e = ROSTER.find((x) => x.nik === i.nik)
  if (!i.nik || !person || !e) errors.nik = 'Pegawai wajib dipilih'
  else if (activeOff(i.nik)) errors.nik = `Sudah ada proses keluar ${activeOff(i.nik)!.no}`
  if (!reason) errors.reason = 'Alasan keluar wajib dipilih'
  if (reason === 'Habis Kontrak') {
    keluar = defaultKeluar(i.nik, reason)
    if (e && (e.statusKerja !== 'Kontrak' || !keluar)) errors.nik = 'Bukan pegawai kontrak'
  }
  if (reason === 'Pensiun' && !keluar) keluar = defaultKeluar(i.nik, reason)
  if (!keluar && reason !== '') errors.tanggalKeluar = 'Tanggal keluar wajib diisi'
  else if (keluar && reason !== 'Meninggal Dunia' && keluar < DEMO_TODAY) errors.tanggalKeluar = 'Tanggal keluar tidak boleh sebelum hari ini'
  if (reason === 'Pensiun' && e && keluar && keluar !== defaultKeluar(i.nik, reason) && !validAlasan(i.catatanTanggal ?? '')) errors.catatanTanggal = `Tanggal berbeda dari tanggal pensiun. ${ALASAN_ERROR}`
  if (reason === 'Mengundurkan Diri') {
    if (!i.dokumen) errors.dokumen = 'Surat pengunduran diri wajib diunggah'
    if (!i.tanggalSurat) errors.tanggalSurat = 'Tanggal surat wajib diisi'
    else if (i.tanggalSurat > DEMO_TODAY) errors.tanggalSurat = 'Tanggal surat tidak boleh setelah hari ini'
    else if (keluar && keluar < i.tanggalSurat) errors.tanggalKeluar = 'Tanggal keluar tidak boleh sebelum tanggal surat'
    else if (keluar && keluar < addDays30(i.tanggalSurat)) warnings.push('Kurang dari 30 hari sejak pengajuan; perlu persetujuan HR & GA Manager.')
  }
  if (reason === 'Meninggal Dunia') {
    if (!i.dokumen) errors.dokumen = 'Surat keterangan kematian wajib diunggah'
    if (!i.ahliWaris?.trim()) errors.ahliWaris = 'Nama ahli waris wajib diisi'
  }
  if (reason === 'PHK Efisiensi' && !i.kondisi) errors.kondisi = 'Kondisi perusahaan wajib dipilih'
  if (reason === 'PHK Efisiensi' || reason === 'PHK Kompetensi') {
    if (!i.dasar || i.dasar.trim().length < 10) errors.dasar = 'Dasar keputusan minimal 10 karakter'
    if (!i.dokumen) errors.dokumen = 'Lampiran dasar keputusan wajib diunggah'
  }
  if (reason === 'PHK Pelanggaran' && person) {
    const sp3 = activeSp3(i.nik)
    if (sp3) spNo = sp3.suratNo
    else if (!i.mendesak) blocked = `Belum ada SP3 aktif untuk ${person.nama}.`
    else if (!i.pasal?.trim()) errors.pasal = 'Pasal PK/PP/PKB wajib diisi'
  }
  if (reason === MANGKIR && person && unansweredPanggilan(i.nik).length < 2) blocked = `Belum ada dua Surat Panggilan tanpa tanggapan untuk ${person.nama}.`
  if (reason && reason !== 'Habis Kontrak' && i.keterangan.trim().length > 0 && i.keterangan.trim().length < 5) errors.keterangan = 'Keterangan terlalu singkat'
  return { person, tanggalKeluar: keluar, errors, warnings, blocked, readOnlyDate, spNo }
}

/* ---------- siklus ---------- */
function newClearance(o: Pick<Off, 'nik'>): ClearItem[] {
  const p = personOf(o.nik)
  const atasan = SUPERVISORS.find((s) => s.id === p?.atasanId)?.nama ?? 'Atasan'
  const items: ClearItem[] = [
    { key: 'aset', label: `Aset dikembalikan (${assetsOf(o.nik).join(', ')})`, pic: 'GA', status: 'Belum' },
    { key: 'akses', label: 'Akses sistem & ID card dinonaktifkan', pic: 'IT', status: 'Belum' },
    { key: 'serah', label: 'Serah terima pekerjaan', pic: atasan, status: 'Belum' },
  ]
  if (isAnggota(o.nik) && memberOf(o.nik)?.status === 'aktif') items.push({ key: 'koperasi', label: 'Kewajiban Koperasi', pic: 'Bendahara Koperasi', status: 'Belum' })
  items.push({ key: 'dokumen', label: 'Dokumen asli dikembalikan (ijazah)', pic: 'HR', status: 'Belum' })
  return items
}

export function startOff(i: OffInput, actor: CurrentUser): { no?: string; errors?: Record<string, string>; blocked?: string } {
  const p = previewOff(i)
  if (p.blocked) return { blocked: p.blocked }
  if (Object.keys(p.errors).length) return { errors: p.errors }
  SEQ.off += 1
  const o: Off = {
    no: `OFF-2026-${String(SEQ.off).padStart(4, '0')}`,
    nik: i.nik,
    reason: i.reason as OffReason,
    tanggalKeluar: p.tanggalKeluar,
    tanggalSurat: i.tanggalSurat,
    dokumen: i.dokumen,
    ahliWaris: i.ahliWaris?.trim() || undefined,
    dasar: i.dasar?.trim() || undefined,
    mendesak: i.mendesak,
    kondisi: i.reason === 'PHK Efisiensi' ? i.kondisi : undefined,
    pasal: i.pasal?.trim() || undefined,
    spNo: p.spNo,
    catatanTanggal: i.catatanTanggal?.trim() || undefined,
    keterangan: i.keterangan.trim(),
    status: 'berjalan',
    diajukan: { by: actor.nama, at: nowStamp(), tanggal: DEMO_TODAY },
    approval: { status: 'menunggu', warning30: p.warnings.length > 0 },
    clearance: [],
    hakAkhirOk: false,
    skkNo: '',
  }
  OFFS.unshift(o)
  syncContractEnding()
  bump()
  return { no: o.no }
}

export function approveOff(no: string, actor: CurrentUser) {
  const o = OFFS.find((x) => x.no === no)
  if (!o || !canReviewOff(o, actor)) return
  o.approval = { ...o.approval, status: 'disetujui', by: actor.nama, at: nowStamp() }
  o.clearance = newClearance(o)
  SEQ.skk += 1
  o.skkNo = skkNumber(SEQ.skk, DEMO_TODAY)
  syncContractEnding()
  hakHook.onApproved(o)
  bump()
}
export function rejectOff(no: string, actor: CurrentUser, alasan: string) {
  const o = OFFS.find((x) => x.no === no)
  if (!o || !canReviewOff(o, actor)) return
  o.approval = { ...o.approval, status: 'ditolak', by: actor.nama, at: nowStamp(), alasan }
  o.status = 'dibatalkan'
  o.dibatalkan = { by: actor.nama, at: nowStamp(), alasan: `Ditolak: ${alasan}` }
  syncContractEnding()
  bump()
}
export function cancelOff(no: string, actor: CurrentUser, alasan: string) {
  const o = OFFS.find((x) => x.no === no)
  if (!o || !canCancelOff(o, actor)) return
  o.status = 'dibatalkan'
  o.dibatalkan = { by: actor.nama, at: nowStamp(), alasan }
  syncContractEnding()
  bump()
}

/** Clearance lengkap bila setiap item Selesai atau Dikecualikan. */
export const clearanceDone = (o: Off) => o.clearance.length > 0 && o.clearance.every((c) => c.status === 'Selesai' || c.status === 'Dikecualikan')
export const needsInterview = (o: Off) => o.reason !== 'Meninggal Dunia'
export const interviewDone = (o: Off) => !needsInterview(o) || !!o.interview
/** Tahap tertinggi yang dapat dibuka (1–6). */
export function reached(o: Off): number {
  if (o.status === 'selesai') return 6
  if (o.approval.status !== 'disetujui') return 2
  if (!clearanceDone(o)) return 3
  if (!interviewDone(o)) return 4
  // Selesai membutuhkan catatan Hak Akhir yang Disetujui atau Dibayar.
  if (!hakDone(o)) return 5
  return 6
}
export const STEP_LABEL = ['Pengajuan', 'Approval', 'Clearance', 'Exit Interview', 'Hak Akhir', 'Selesai']
export const progressText = (o: Off) => {
  if (o.status === 'selesai') return '6/6 Selesai'
  if (o.status === 'dibatalkan') return '—'
  const r = reached(o)
  return `${r}/6 ${STEP_LABEL[r - 1]}`
}

export function setClearance(no: string, key: ClearKey, patch: { status: ClearStatus; catatan?: string }, actor: CurrentUser): string {
  const o = OFFS.find((x) => x.no === no)
  const c = o?.clearance.find((x) => x.key === key)
  if (!o || !c || o.status !== 'berjalan') return 'Tidak dapat mengubah clearance'
  if (user_cannot(actor)) return 'Hanya Admin HRD yang mencatat clearance'
  if (key === 'koperasi') return 'Item Koperasi dikonfirmasi oleh Bendahara'
  c.status = patch.status
  c.catatan = patch.catatan?.trim() || c.catatan
  c.tanggal = patch.status === 'Selesai' ? DEMO_TODAY : undefined
  bump()
  return ''
}
const user_cannot = (u: CurrentUser) => u.role !== 'admin' && u.role !== 'manager'
export function exceptClearance(no: string, key: ClearKey, alasan: string, actor: CurrentUser): string {
  const o = OFFS.find((x) => x.no === no)
  const c = o?.clearance.find((x) => x.key === key)
  if (!o || !c || o.status !== 'berjalan' || actor.role !== 'manager') return 'Hanya HR & GA Manager yang dapat mengecualikan'
  if (!validAlasan(alasan)) return ALASAN_ERROR
  c.status = 'Dikecualikan'
  c.kecuali = { alasan: alasan.trim(), oleh: actor.nama }
  c.tanggal = DEMO_TODAY
  bump()
  return ''
}
export function saveInterview(no: string, iv: Omit<Interview, 'oleh' | 'at'>, actor: CurrentUser): string {
  const o = OFFS.find((x) => x.no === no)
  if (!o || o.status !== 'berjalan' || !canSeeInterview(actor)) return 'Tidak dapat menyimpan exit interview'
  if (!iv.alasanUtama) return 'Alasan utama wajib dipilih'
  if (Object.values(iv.ratings).some((r) => r < 1 || r > 5)) return 'Semua penilaian wajib diisi (1–5)'
  if (iv.rehire === 'Tidak' && !iv.rehireCatatan.trim()) return 'Catatan wajib bila Eligible for Rehire = Tidak'
  o.interview = { ...iv, oleh: actor.nama, at: nowStamp() }
  bump()
  return ''
}
export function ackHakAkhir(no: string) {
  const o = OFFS.find((x) => x.no === no)
  if (!o || o.status !== 'berjalan') return
  o.hakAkhirOk = true
  bump()
}

/** Bendahara mengonfirmasi kewajiban Koperasi; HR hanya melihat status item dan nominal potongan. */
export function confirmKoperasi(no: string, keputusan: 'lunas' | 'potong' | 'tunai', actor: { nama: string }): string {
  const o = OFFS.find((x) => x.no === no)
  const c = o?.clearance.find((x) => x.key === 'koperasi')
  if (!o || !c || o.status !== 'berjalan') return 'Tidak ada item Koperasi yang dapat dikonfirmasi'
  const kb = koperasiBalance(o.nik)
  if (keputusan === 'lunas' && kb.kewajiban > 0) return `Masih ada kewajiban Rp ${kb.kewajiban.toLocaleString('id-ID')}; pilih Dipotong dari hak akhir atau Diselesaikan tunai`
  const potongan = keputusan === 'potong' ? kb.kewajiban : 0
  o.koperasi = { keputusan, potongan, oleh: actor.nama, at: nowStamp() }
  c.status = 'Selesai'
  c.tanggal = DEMO_TODAY
  c.catatan = keputusan === 'lunas' ? 'Lunas / tidak ada kewajiban' : keputusan === 'potong' ? `Potong hak akhir Rp ${potongan.toLocaleString('id-ID')} untuk Koperasi` : 'Diselesaikan tunai'
  bumpKoperasi()
  bump()
  return ''
}

/** Efek yang berlaku saat Selesai; mengembalikan daftar teks untuk ditampilkan. */
export function finishOff(no: string, actor: CurrentUser): { effects: string[]; off?: Off } {
  const o = OFFS.find((x) => x.no === no)
  if (!o || o.status !== 'berjalan' || reached(o) < 6) return { effects: [] }
  o.status = 'selesai'
  o.selesai = { by: actor.nama, at: nowStamp() }
  const nonaktif = addDayIso(o.tanggalKeluar)
  const effects = [nonaktif > DEMO_TODAY ? `Terjadwal nonaktif ${formatDate(nonaktif)}` : `Nonaktif sejak ${formatDate(nonaktif)}`]
  const p = personOf(o.nik)
  // BPJS Kepesertaan → Nonaktif mulai bulan berikutnya (effective-dated, tidak mengubah periode berjalan).
  const next = `${o.tanggalKeluar.slice(0, 7)}-01`
  const first = new Date(Date.parse(`${next}T00:00:00Z`))
  first.setUTCMonth(first.getUTCMonth() + 1)
  const berlaku = first.toISOString().slice(0, 10)
  if (p && ROSTER.some((e) => e.nik === o.nik)) {
    const cur = membershipAt(o.nik, berlaku)
    saveMembership(o.nik, p.nama, { ...cur, kesStatus: 'Nonaktif', tkStatus: 'Nonaktif' }, berlaku, `Pegawai keluar (${o.no})`, actor.nama)
    effects.push(`BPJS Kepesertaan Nonaktif mulai ${formatDate(berlaku)}`)
  }
  if (o.clearance.some((c) => c.key === 'koperasi')) effects.push('Keanggotaan Koperasi berstatus Keluar setelah tanggal keluar')
  effects.push('Pengajuan pegawai setelah tanggal keluar dibatalkan (alasan "Pegawai keluar")')
  bump()
  return { effects, off: o }
}

/* ---------- ringkasan ---------- */
export const visibleOffs = (user: CurrentUser) => OFFS.filter((o) => canSeeOff(o, user))
const roster = () => ROSTER.filter((e) => e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik))
/** Calon pensiun ≤ 6 bulan (aturan Usia Pensiun) yang belum punya proses keluar. */
export function nearRetirementList(filter?: (e: (typeof ROSTER)[number]) => boolean) {
  return roster()
    .filter((e) => nearRetirement(birthOf(e)) && !activeOff(e.nik) && (!filter || filter(e)))
    .map((e) => ({ emp: e, tanggal: retirementDate(birthOf(e)) }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}
/** Turnover tahun berjalan: keluar dihitung turnover ÷ rata-rata headcount awal (31 Des) dan akhir bulan ini, dari seri Tren Karyawan Aktif. */
export function turnoverStats(year = Number(DEMO_TODAY.slice(0, 4))) {
  const keluar = OFFS.filter((o) => o.status === 'selesai' && o.tanggalKeluar.slice(0, 4) === String(year) && o.tanggalKeluar <= DEMO_TODAY && turnoverFlag(o.reason)).length
  const awal = headcountStart(year) ?? 0
  const akhir = headcountAt(year, Number(DEMO_TODAY.slice(5, 7))) ?? roster().length
  const avg = (awal + akhir) / 2
  return { keluar, awal, akhir, avg, pct: avg ? (keluar / avg) * 100 : 0 }
}
export function offKpi(list: Off[]) {
  const month = DEMO_TODAY.slice(0, 7)
  return {
    berjalan: list.filter((o) => o.status === 'berjalan').length,
    bulanIni: list.filter((o) => o.status !== 'dibatalkan' && o.approval.status === 'disetujui' && o.tanggalKeluar.slice(0, 7) === month).length,
  }
}

/* ---------- seed ---------- */
function seed() {
  const ADM = 'Admin HRD'
  const done = (n: number, nik: string, reason: OffReason, surat: string | undefined, keluar: string, diajukan: string, iv: Omit<Interview, 'oleh' | 'at'>, skk: number): Off => ({
    no: `OFF-2026-${String(n).padStart(4, '0')}`, nik, reason, tanggalKeluar: keluar, tanggalSurat: surat, dokumen: surat ? 'surat-pengunduran-diri.pdf' : undefined,
    keterangan: '', status: 'selesai', diajukan: { by: ADM, at: `${formatDate(diajukan)}, 09.00 WIB`, tanggal: diajukan },
    approval: { status: 'disetujui', by: 'Lestari Wulandari', at: `${formatDate(diajukan)}, 15.00 WIB` },
    clearance: [
      { key: 'aset', label: 'Aset dikembalikan', pic: 'GA', status: 'Selesai', tanggal: keluar },
      { key: 'akses', label: 'Akses sistem & ID card dinonaktifkan', pic: 'IT', status: 'Selesai', tanggal: keluar },
      { key: 'serah', label: 'Serah terima pekerjaan', pic: 'Atasan', status: 'Selesai', tanggal: keluar },
      { key: 'dokumen', label: 'Dokumen asli dikembalikan (ijazah)', pic: 'HR', status: 'Selesai', tanggal: keluar },
    ],
    interview: { ...iv, oleh: ADM, at: `${formatDate(keluar)}, 10.00 WIB` }, hakAkhirOk: true, selesai: { by: ADM, at: `${formatDate(keluar)}, 16.00 WIB` }, skkNo: skkNumber(skk, keluar),
  })
  const r = (a: number, b: number, c: number, d: number, e: number) => ({ atasan: a, rekan: b, beban: c, kompensasi: d, lingkungan: e })
  OFFS.push(
    done(3, 'PPI-2001-0004', 'Pensiun', undefined, '2026-08-31', '2026-08-03', { alasanUtama: 'Pensiun', ratings: r(4, 5, 3, 4, 4), saran: 'Regenerasi teknisi senior perlu dipercepat.', rehire: 'Tidak', rehireCatatan: 'Usia pensiun' }, 9),
    done(2, 'PPI-2025-0019', 'Habis Kontrak', undefined, '2026-09-30', '2026-09-01', { alasanUtama: 'Kontrak tidak diperpanjang', ratings: r(4, 4, 4, 3, 4), saran: 'Informasi perpanjangan kontrak sebaiknya lebih awal.', rehire: 'Ya', rehireCatatan: '' }, 10),
    done(1, 'PPI-2022-0047', 'Mengundurkan Diri', '2026-08-10', '2026-09-15', '2026-08-11', { alasanUtama: 'Kesempatan karier di tempat lain', ratings: r(3, 4, 3, 2, 4), saran: 'Jenjang karier operator perlu dipetakan.', rehire: 'Ya', rehireCatatan: '' }, 11),
  )
  OFFS.sort((a, b) => b.no.localeCompare(a.no))
  const fitri = ROSTER.find((e) => e.nama === 'Fitri Handayani')!
  const o: Off = {
    no: 'OFF-2026-0004', nik: fitri.nik, reason: 'Mengundurkan Diri', tanggalKeluar: '2026-11-13', tanggalSurat: '2026-10-12', dokumen: 'surat-pengunduran-diri-fitri.pdf',
    keterangan: 'Pindah domisili mengikuti keluarga.', status: 'berjalan', diajukan: { by: ADM, at: '12 Okt 2026, 13.10 WIB', tanggal: '2026-10-12' },
    approval: { status: 'disetujui', by: 'Lestari Wulandari', at: '14 Okt 2026, 10.20 WIB' }, clearance: [], hakAkhirOk: false, skkNo: skkNumber(12, '2026-10-14'),
  }
  o.clearance = newClearance(o).map((c) =>
    c.key === 'aset' || c.key === 'akses' || c.key === 'dokumen' ? { ...c, status: 'Selesai' as const, tanggal: '2026-10-22' } : c.key === 'serah' ? { ...c, status: 'Berjalan' as const, catatan: 'Dokumen shift QC sedang diserahkan ke Leader QC' } : c,
  )
  OFFS.unshift(o)
  SEQ.skk = 12
  syncContractEnding()
}
seed()

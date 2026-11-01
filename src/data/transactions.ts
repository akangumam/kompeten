import { can } from '@/lib/access'
import { useSyncExternalStore } from 'react'
import { nowStamp } from '@/data/attendance'
import { CONTRACT_ENDING, CONTRACT_FLAGS, daysFromToday, CONTRACT_WARN_DAYS, ROSTER, type ContractFlag, type RosterEmployee } from '@/data/employees'
import { atasanForPlacement, atasanName } from '@/data/directory'
import { addDayIso, contractEnd, contractsOf, kpkHook, lastContract, maxExtensionMonths, setContractOverlay, setSeedContracts, totalContractMonths, type Contract } from '@/data/contracts'
import { chainFor } from '@/data/master/approvers'
import { periodContaining, periodForId } from '@/data/master/attendance-rules'
import { contractLimitMonths, monthsText } from '@/data/master/contract-limit'
import { kelompokFor, statusOptionsOf } from '@/data/master/jenis'
import { KELOMPOK_DASAR, LEVEL_DEFS, pembagiOf } from '@/data/master/levels'
import { orgById, sectionNodesOf } from '@/data/master/organization'
import { gradeList, positionByName } from '@/data/master/positions'
import { isAnggota, ELIGIBLE_JENIS, memberOf } from '@/data/koperasi/members'
import { tunjanganAt, upahHarianAt } from '@/data/payroll/components'
import { PAY_PERIODS, periodFinalized, type PeriodId } from '@/data/payroll/runs'
import { gradeError, idr, salaryAt, syncRoster } from '@/data/payroll/salaries'
import { recordApprovedChange } from '@/data/payroll/salary-change'
import { bump as bumpPayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { exitRecord, personOf } from '@/data/offboarding'

/** Transaksi Kepegawaian: satu-satunya cara mengubah jabatan, penempatan, kontrak, atau kategori pegawai aktif. */
export type TrxJenis = 'Promosi' | 'Demosi' | 'Rotasi' | 'Mutasi' | 'Perpanjangan Kontrak' | 'Pengangkatan Tetap' | 'Pindah Kategori'
export const TRX_JENIS: TrxJenis[] = ['Promosi', 'Demosi', 'Rotasi', 'Mutasi', 'Perpanjangan Kontrak', 'Pengangkatan Tetap', 'Pindah Kategori']
export const JENIS_NOTE: Record<TrxJenis, string> = {
  Promosi: 'Naik ke posisi dengan level lebih tinggi',
  Demosi: 'Turun ke posisi dengan level lebih rendah',
  Rotasi: 'Pindah section dalam department yang sama',
  Mutasi: 'Pindah department dan section',
  'Perpanjangan Kontrak': 'Kontrak baru setelah kontrak berjalan berakhir',
  'Pengangkatan Tetap': 'Kontrak menjadi pegawai Tetap',
  'Pindah Kategori': 'Ganti Jenis Karyawan dan Status Kerja',
}
export const DEMOSI_ALASAN = ['Hasil evaluasi kinerja', 'Sanksi disiplin', 'Permintaan pegawai', 'Restrukturisasi'] as const
export const PAY_TYPES: TrxJenis[] = ['Promosi', 'Demosi', 'Pindah Kategori']

export type TrxStatus = 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'
export const STATUS_LABEL: Record<TrxStatus, string> = { menunggu: 'Menunggu Approval', disetujui: 'Disetujui', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan' }

/** Data penempatan dan kategori pegawai yang dapat berubah lewat transaksi. */
export type Placement = {
  department: string
  /** Id node Section (Organisasi). */
  sec: string
  section: string
  posisi: string
  level: string
  grade: string
  jenis: string
  statusKerja: string
  kelompok: string
  tanggalAkhir: string
  atasanId: string
}
export type TrxStep = { label: string; personId: string; person: string; status: 'menunggu' | 'disetujui' | 'ditolak'; by?: string; at?: string; mewakili?: string; alasan?: string }
export type TrxKontrak = { ke: number; mulai: string; akhir: string; bulan: number }
export type Trx = {
  no: string
  nik: string
  jenis: TrxJenis
  status: TrxStatus
  efektif: string
  periodeId?: string
  sebelum: Placement
  sesudah: Placement
  gaji?: { lama: number; baru: number }
  kontrak?: TrxKontrak
  alasanDemosi?: string
  alasan: string
  lampiran?: string
  diajukan: { by: string; at: string; tanggal: string }
  steps: TrxStep[]
  keputusan?: { by: string; at: string; alasan?: string }
  applied: boolean
  suratNo: string
  perubahanGajiNo?: string
}

export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)
const levelIdx = (l: string) => LEVEL_DEFS.findIndex((x) => x.nama === l)
export const isActive = (e: RosterEmployee) => e.tanggalMasuk <= DEMO_TODAY

export function placementOf(e: RosterEmployee): Placement {
  return {
    department: e.department,
    sec: e.sec,
    section: orgById(e.sec)?.nama ?? '',
    posisi: e.posisi,
    level: e.level,
    grade: e.grade,
    jenis: e.jenis ?? 'Organik',
    statusKerja: e.statusKerja,
    kelompok: e.kelompok,
    tanggalAkhir: e.tanggalAkhir ?? '',
    atasanId: e.atasanId,
  }
}
export const supName = (id: string) => (id === 'manager' ? 'Lestari Wulandari' : atasanName(id))
export const placeText = (p: Placement) => (p.section && p.section !== p.department ? `${p.department} · ${p.section}` : p.department)

/* ---------- penyimpanan dan hook ---------- */
let version = 0
const subs = new Set<() => void>()
export const bump = () => {
  version++
  subs.forEach((f) => f())
}
/** Berlangganan perubahan transaksi dan data roster hasilnya; mengembalikan nomor versi untuk dependensi useMemo. */
export const useTrx = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )

export const TRX: Trx[] = []
const byNo = (no: string) => TRX.find((t) => t.no === no)
export const trxOf = (nik: string) => TRX.filter((t) => t.nik === nik)

/* ---------- nomor ---------- */
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const pad3 = (n: number) => String(n).padStart(3, '0')
const suratKind = (j: TrxJenis) => (j === 'Perpanjangan Kontrak' ? 'PKWT' : 'SK')
const SEQ = { trx: 48, SK: 39, PKWT: 14 }
export const suratNumber = (kind: 'SK' | 'PKWT', n: number, tanggal: string) => `${kind}/HRD-PPI/${pad3(n)}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tanggal.slice(0, 4)}`
export const nextTrxNo = () => `TRX-2026-${String(SEQ.trx + 1).padStart(4, '0')}`
export const nextSuratNo = (j: TrxJenis) => suratNumber(suratKind(j), SEQ[suratKind(j)] + 1, DEMO_TODAY)

/* ---------- persetujuan ---------- */
export function stepsFor(e: RosterEmployee): TrxStep[] {
  const first = chainFor(e)[0]?.person
  const mgr = { id: 'manager', nama: 'Lestari Wulandari' }
  const out: TrxStep[] = []
  if (first && first.id !== 'manager') out.push({ label: 'Penyetuju 1', personId: first.id, person: first.nama, status: 'menunggu' })
  out.push({ label: out.length ? 'HR & GA Manager (persetujuan akhir)' : 'HR & GA Manager', personId: mgr.id, person: mgr.nama, status: 'menunggu' })
  return out
}
export const currentStep = (t: Trx) => (t.status === 'menunggu' ? t.steps.find((s) => s.status === 'menunggu') : undefined)
/** Atasan membuka transaksi untuk timnya; HR & GA Manager meninjau semua; creator tidak pernah menyetujui miliknya sendiri. */
export function canReview(t: Trx, user: CurrentUser): boolean {
  const s = currentStep(t)
  if (!s || t.diajukan.by === user.nama) return false
  if (user.role === 'manager') return t.nik !== 'manager'
  return user.role === 'supervisor' && s.personId === user.nik
}
export function canSee(t: Trx, user: CurrentUser): boolean {
  if (can(user, 'trx.view-all')) return true
  if (user.role === 'payroll') return t.status === 'disetujui'
  if (user.role === 'supervisor') return empOf(t.nik)?.atasanId === user.nik || t.steps.some((s) => s.personId === user.nik)
  return false
}
export const canCreate = (user: CurrentUser) => can(user, 'trx.manage')
export const canCancel = (t: Trx, user: CurrentUser) => can(user, 'trx.manage') && t.status === 'menunggu'
export const showsPay = (user: CurrentUser) => user.role !== 'supervisor'
export const isFuture = (t: Trx) => t.status === 'disetujui' && !t.applied
export const waitingFor = (t: Trx) => currentStep(t)?.person

/* ---------- periode payroll ---------- */
export type PeriodOption = { id: string; label: string; start: string; text: string }
/** Periode payroll yang belum Final dan belum berakhir; tanggal efektif = hari pertamanya. */
export function payrollPeriodOptions(): PeriodOption[] {
  return ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03']
    .map((id) => periodForId(id))
    .filter((p) => p.end >= DEMO_TODAY && !(PAY_PERIODS.some((x) => x.id === p.id) && periodFinalized(p.id as PeriodId)))
    .map((p) => ({ id: p.id, label: p.label, start: p.start, text: `${p.label} · mulai ${formatDate(p.start)}` }))
}
export const periodText = (id: string) => `Periode ${periodForId(id).label}`

/* ---------- kelayakan ---------- */
export function pendingContractTrx(nik: string) {
  return TRX.find((t) => t.nik === nik && t.status === 'menunggu' && (t.jenis === 'Perpanjangan Kontrak' || t.jenis === 'Pengangkatan Tetap'))
}
/** Alasan pegawai tidak bisa dipilih untuk sebuah jenis; null bila boleh. */
export function ineligibleReason(jenis: TrxJenis, e: RosterEmployee): string | null {
  if (!isActive(e)) return 'Belum aktif'
  const open = TRX.find((t) => t.nik === e.nik && t.status === 'menunggu' && (t.jenis === jenis || (jenis !== 'Perpanjangan Kontrak' && jenis !== 'Pengangkatan Tetap' ? false : pendingContractTrx(e.nik) === t)))
  if (open) return `Sudah ada ${open.jenis} menunggu approval (${open.no})`
  if ((jenis === 'Perpanjangan Kontrak' || jenis === 'Pengangkatan Tetap') && CONTRACT_ENDING[e.nik]) return 'Pengakhiran kontrak sedang diproses'
  if (jenis === 'Perpanjangan Kontrak') {
    if (e.statusKerja !== 'Kontrak') return 'Bukan pegawai kontrak'
    if (TRX.some((t) => t.nik === e.nik && t.jenis === 'Pengangkatan Tetap' && isFuture(t))) return 'Pengangkatan Tetap sudah disetujui'
  }
  if (jenis === 'Pengangkatan Tetap') {
    if ((e.jenis ?? 'Organik') !== 'Organik') return 'Hanya untuk Jenis Organik'
    if (e.statusKerja !== 'Kontrak') return 'Sudah berstatus Tetap'
    if (TRX.some((t) => t.nik === e.nik && t.jenis === 'Perpanjangan Kontrak' && isFuture(t))) return 'Perpanjangan sudah disetujui'
  }
  return null
}

/* ---------- pratinjau / validasi ---------- */
export type TrxInput = {
  jenis: TrxJenis
  nik: string
  /** Rotasi, Mutasi, Pengangkatan Tetap. */
  efektif?: string
  /** Promosi, Demosi, Pindah Kategori. */
  periodeId?: string
  posisi?: string
  kelompok?: string
  gaji?: number
  department?: string
  section?: string
  atasanId?: string
  durasi?: number
  jenisBaru?: string
  statusBaru?: string
  alasanDemosi?: string
  alasan: string
  lampiran?: string
}
export type Preview = {
  emp: RosterEmployee
  before: Placement
  after: Placement
  efektif: string
  periodeId?: string
  kontrak?: TrxKontrak
  gaji?: { lama: number; baru: number }
  errors: Record<string, string>
  warnings: string[]
  /** Total masa kontrak (bulan) setelah transaksi, bila relevan. */
  totalBulan?: number
}

const gradeFor = (posisi: string, cur: string, up: boolean) => {
  const p = positionByName(posisi)
  if (!p) return cur
  const list = gradeList(p.grade)
  const num = (g: string) => Number(g.slice(1))
  return up ? (list.find((g) => num(g) >= num(cur)) ?? list.at(-1)!) : ([...list].reverse().find((g) => num(g) <= num(cur)) ?? list[0])
}
/** Group Kerja turunan untuk Promosi/Demosi mengikuti default Level (dapat diubah pengguna). */
export const derivedKelompok = (jenis: string, level: string, posisi = '') => kelompokFor(jenis, level, posisi)
const sectionByName = (dept: string, name: string) => sectionNodesOf(dept).find((s) => s.nama === name)
export const autoAtasan = (dept: string, section: string) => atasanForPlacement(dept, section)

export function previewTrx(input: TrxInput): Preview | null {
  const emp = empOf(input.nik)
  if (!emp) return null
  const before = placementOf(emp)
  const after: Placement = { ...before }
  const errors: Record<string, string> = {}
  const warnings: string[] = []
  const j = input.jenis
  let efektif = ''
  let periodeId: string | undefined
  let kontrak: TrxKontrak | undefined
  let gaji: Preview['gaji']
  let totalBulan: number | undefined

  if (PAY_TYPES.includes(j)) {
    const opt = payrollPeriodOptions().find((o) => o.id === input.periodeId)
    if (!input.periodeId) errors.periodeId = 'Periode payroll wajib dipilih'
    else if (!opt) errors.periodeId = 'Periode sudah Final atau berakhir'
    else {
      efektif = opt.start
      periodeId = opt.id
    }
  } else if (j !== 'Perpanjangan Kontrak') {
    efektif = input.efektif ?? ''
    if (!efektif) errors.efektif = 'Tanggal efektif wajib diisi'
    else if (efektif < DEMO_TODAY) errors.efektif = 'Tanggal efektif tidak boleh sebelum hari ini'
  }
  const salaryNow = (d: string) => salaryAt(emp, d || DEMO_TODAY).gajiPokok

  if (j === 'Promosi' || j === 'Demosi') {
    const up = j === 'Promosi'
    const pos = input.posisi ? positionByName(input.posisi) : undefined
    if (!pos) errors.posisi = 'Posisi baru wajib dipilih'
    else {
      const a = levelIdx(pos.level)
      const b = levelIdx(before.level)
      if (up ? a <= b : a >= b) errors.posisi = up ? `Level harus lebih tinggi dari ${before.level}` : `Level harus lebih rendah dari ${before.level}`
      after.posisi = pos.nama
      after.level = pos.level
      after.grade = gradeFor(pos.nama, before.grade, up)
      after.kelompok = input.kelompok || derivedKelompok(before.jenis, pos.level)
      if (pos.department && pos.department !== before.department) {
        after.department = pos.department
        const sec = sectionNodesOf(pos.department)[0]
        if (sec) {
          after.sec = sec.id
          after.section = sec.nama
        }
        after.atasanId = autoAtasan(after.department, after.section)
      } else if (pos.section && pos.section !== before.section) {
        const sec = sectionByName(before.department, pos.section)
        if (sec) {
          after.sec = sec.id
          after.section = sec.nama
        }
      }
    }
    if (j === 'Demosi') {
      if (!input.alasanDemosi) errors.alasanDemosi = 'Alasan demosi wajib dipilih'
    }
    if (input.gaji !== undefined && before.kelompok !== 'Harian') {
      const lama = salaryNow(efektif)
      if (!(input.gaji > 0)) errors.gaji = 'Nominal harus lebih dari 0'
      else if (input.gaji === lama) errors.gaji = 'Gaji Pokok baru sama dengan gaji saat ini'
      else {
        gaji = { lama, baru: input.gaji }
        const g = pos ? gradeError(after.grade, input.gaji) : ''
        if (g) warnings.push(`${g}. Persetujuan akhir HR & GA Manager diperlukan sebagai pengecualian.`)
      }
    }
  }

  if (j === 'Rotasi') {
    if (!input.section) errors.section = 'Section baru wajib dipilih'
    else {
      const sec = sectionByName(before.department, input.section)
      if (!sec) errors.section = 'Section tidak ada di department ini'
      else if (sec.id === before.sec) errors.section = 'Pilih section yang berbeda dari saat ini'
      else {
        after.sec = sec.id
        after.section = sec.nama
      }
    }
    if (input.posisi && input.posisi !== before.posisi) {
      const pos = positionByName(input.posisi)
      if (pos) {
        after.posisi = pos.nama
        after.level = pos.level
        after.grade = gradeFor(pos.nama, before.grade, true)
      }
    }
    after.atasanId = input.atasanId || autoAtasan(after.department, after.section)
  }

  if (j === 'Mutasi') {
    if (!input.department) errors.department = 'Department tujuan wajib dipilih'
    else if (input.department === before.department) errors.department = 'Pilih department yang berbeda. Untuk pindah section gunakan Rotasi'
    else {
      after.department = input.department
      const sec = input.section ? sectionByName(input.department, input.section) : undefined
      if (!sec) errors.section = 'Section tujuan wajib dipilih'
      else {
        after.sec = sec.id
        after.section = sec.nama
      }
    }
    if (input.posisi && input.posisi !== before.posisi) {
      const pos = positionByName(input.posisi)
      if (pos) {
        after.posisi = pos.nama
        after.level = pos.level
        after.grade = gradeFor(pos.nama, before.grade, true)
      }
    }
    if (!errors.section && !errors.department) after.atasanId = input.atasanId || autoAtasan(after.department, after.section)
  }

  if (j === 'Perpanjangan Kontrak') {
    const last = lastContract(emp.nik)
    const end = last?.akhir ?? emp.tanggalAkhir ?? ''
    const mulai = end ? addDayIso(end) : ''
    efektif = mulai
    const d = input.durasi ?? 0
    const max = maxExtensionMonths(emp.nik)
    if (!end) errors.nik = 'Pegawai tidak memiliki kontrak berjalan'
    else if (!Number.isInteger(d) || d < 1 || d > 24) errors.durasi = 'Durasi 1–24 bulan'
    else {
      const total = totalContractMonths(emp.nik) + d
      totalBulan = total
      if (total > contractLimitMonths()) {
        errors.durasi = `Total masa kontrak menjadi ${monthsText(total)}, melebihi batas ${monthsText(contractLimitMonths())}. Maksimal perpanjangan ${Math.min(max, 24)} bulan, atau proses Pengangkatan Tetap.`
      }
      const akhir = contractEnd(mulai, d)
      kontrak = { ke: contractsOf(emp.nik).length + 1, mulai, akhir, bulan: d }
      after.tanggalAkhir = akhir
    }
  }

  if (j === 'Pengangkatan Tetap') {
    const last = lastContract(emp.nik)
    const end = last?.akhir ?? emp.tanggalAkhir ?? ''
    if (efektif && end && efektif > addDayIso(end)) errors.efektif = `Tanggal efektif maksimal ${formatDate(addDayIso(end))}, sehari setelah kontrak berakhir`
    after.statusKerja = 'Tetap'
    after.tanggalAkhir = ''
  }

  if (j === 'Pindah Kategori') {
    const nj = input.jenisBaru ?? ''
    if (!nj) errors.jenisBaru = 'Jenis Karyawan baru wajib dipilih'
    else if (nj === before.jenis) errors.jenisBaru = 'Pilih jenis karyawan yang berbeda dari saat ini'
    else {
      after.jenis = nj
      after.kelompok = input.kelompok || kelompokFor(nj, before.level, before.posisi)
      const opts = statusOptionsOf(nj)
      const st = input.statusBaru && opts.includes(input.statusBaru) ? input.statusBaru : opts.length === 1 ? opts[0] : ''
      if (!st) errors.statusBaru = 'Status Kerja wajib dipilih'
      after.statusKerja = st
      if (st === 'Kontrak') {
        const d = input.durasi ?? 0
        if (!Number.isInteger(d) || d < 1 || d > 24) errors.durasi = 'Durasi 1–24 bulan'
        else if (efektif) {
          const akhir = contractEnd(efektif, d)
          kontrak = { ke: 1, mulai: efektif, akhir, bulan: d }
          after.tanggalAkhir = akhir
          totalBulan = d
        }
      } else after.tanggalAkhir = ''
      const fromBasis = KELOMPOK_DASAR[before.kelompok as keyof typeof KELOMPOK_DASAR]?.basis
      const toBasis = KELOMPOK_DASAR[after.kelompok as keyof typeof KELOMPOK_DASAR]?.basis
      if (fromBasis === 'Harian' && toBasis === 'Bulanan') {
        const lama = salaryNow(efektif)
        if (!input.gaji || !(input.gaji > 0)) errors.gaji = 'Gaji Pokok baru wajib diisi'
        else if (input.gaji !== lama) {
          gaji = { lama, baru: input.gaji }
        }
        if (input.gaji && gradeError(emp.grade, input.gaji)) warnings.push(`${gradeError(emp.grade, input.gaji)}.`)
      }
      if (!ELIGIBLE_JENIS.includes(nj) && isAnggota(emp.nik)) warnings.push('Keanggotaan koperasi perlu ditinjau pengurus.')
    }
  }

  if (!validAlasan(input.alasan)) errors.alasan = ALASAN_ERROR
  return { emp, before, after, efektif, periodeId, kontrak, gaji, errors, warnings, totalBulan }
}

/* ---------- Dampak ---------- */
export type ImpactLine = { text: string; pay?: boolean }
/** Daftar dampak dibangkitkan dari selisih penempatan; baris Rupiah ditandai `pay` agar disembunyikan untuk Atasan. */
export function impactLines(t: Pick<Trx, 'jenis' | 'sebelum' | 'sesudah' | 'efektif' | 'gaji' | 'kontrak' | 'nik'>, pendingNos: string[] = []): ImpactLine[] {
  const { sebelum: b, sesudah: a } = t
  const out: ImpactLine[] = []
  const per = periodContaining(t.efektif).label
  if (a.atasanId !== b.atasanId) out.push({ text: `Atasan: ${supName(b.atasanId)} → ${supName(a.atasanId)}` })
  if (a.department !== b.department) out.push({ text: `Department: ${b.department} → ${a.department}` })
  else if (a.sec !== b.sec) out.push({ text: `Section: ${b.section} → ${a.section}` })
  if (a.posisi !== b.posisi) out.push({ text: `Posisi: ${b.posisi} → ${a.posisi} (Level ${b.level} → ${a.level}, Grade ${b.grade} → ${a.grade})` })
  if (a.jenis !== b.jenis) out.push({ text: `Jenis Karyawan: ${b.jenis} → ${a.jenis}` })
  if (a.statusKerja !== b.statusKerja) out.push({ text: `Status Kerja: ${b.statusKerja} → ${a.statusKerja}` })
  if (a.kelompok !== b.kelompok) {
    const pb = KELOMPOK_DASAR[b.kelompok as keyof typeof KELOMPOK_DASAR]?.basis === 'Harian' ? null : pembagiOf(b.kelompok, b.level)
    const pa = KELOMPOK_DASAR[a.kelompok as keyof typeof KELOMPOK_DASAR]?.basis === 'Harian' ? null : pembagiOf(a.kelompok, a.level)
    const pem = pb !== null && pa !== null ? `pembagi ${pb} → ${pa}` : pa !== null ? `pembagi ${pa}` : 'upah per hari hadir'
    out.push({ text: `Group Kerja: ${b.kelompok} → ${a.kelompok} (${pem}) mulai payroll ${per}` })
  }
  if (a.level !== b.level) {
    const x = tunjanganAt(b.level, t.efektif)
    const y = tunjanganAt(a.level, t.efektif)
    if (x !== y) out.push({ text: `Tunjangan Jabatan per Level: ${idr(x)} → ${idr(y)}`, pay: true })
  }
  const basisB = KELOMPOK_DASAR[b.kelompok as keyof typeof KELOMPOK_DASAR]?.basis
  const basisA = KELOMPOK_DASAR[a.kelompok as keyof typeof KELOMPOK_DASAR]?.basis
  const gp = t.gaji ? idr(t.gaji.baru) : 'Gaji Pokok'
  if (basisB === 'Harian' && basisA === 'Bulanan') out.push({ text: `Dasar gaji: Upah Harian ${idr(upahHarianAt(t.efektif))} → Gaji Pokok${t.gaji ? ` ${gp}` : ''}`, pay: true })
  if (basisB === 'Bulanan' && basisA === 'Harian') out.push({ text: `Dasar gaji: Gaji Pokok → Upah Harian ${idr(upahHarianAt(t.efektif))}`, pay: true })
  if (t.gaji) out.push({ text: `Perubahan Gaji akan dibuat: ${idr(t.gaji.lama)} → ${idr(t.gaji.baru)}`, pay: true })
  if (t.jenis === 'Perpanjangan Kontrak' && t.kontrak) {
    out.push({ text: `Kontrak ke-${t.kontrak.ke}: ${formatDate(t.kontrak.mulai)} – ${formatDate(t.kontrak.akhir)} (${t.kontrak.bulan} bulan)` })
    out.push({ text: `Total masa kontrak menjadi ${monthsText(totalContractMonths(t.nik) + (contractsOf(t.nik).some((c) => c.mulai === t.kontrak!.mulai) ? 0 : t.kontrak.bulan))} dari batas ${monthsText(contractLimitMonths())}` })
  }
  if (t.jenis === 'Pindah Kategori' && t.kontrak) out.push({ text: `Kontrak ke-1: ${formatDate(t.kontrak.mulai)} – ${formatDate(t.kontrak.akhir)} (${t.kontrak.bulan} bulan)` })
  if (t.jenis === 'Pengangkatan Tetap') {
    const last = lastContract(t.nik)
    if (last && t.efektif <= last.akhir) out.push({ text: `Kontrak ke-${last.ke} berakhir lebih awal pada ${formatDate(addDayIso(t.efektif, -1))} (Digantikan pengangkatan tetap)` })
    out.push({ text: 'Masa kerja dihitung sejak tanggal masuk pertama' })
  }
  if (a.atasanId !== b.atasanId) {
    out.push({ text: `Pengajuan yang menunggu approval atasan lama akan dialihkan ke ${supName(a.atasanId)}${pendingNos.length ? ` (${pendingNos.join(', ')})` : ''}` })
  }
  return out
}

/* ---------- ringkasan satu baris ---------- */
const diff = (x: string, y: string) => `${x || '—'} → ${y || '—'}`
export function changeLine(t: Pick<Trx, 'jenis' | 'sebelum' | 'sesudah' | 'gaji' | 'kontrak' | 'alasanDemosi'>, showPay: boolean): string {
  const { sebelum: b, sesudah: a } = t
  const parts: string[] = []
  switch (t.jenis) {
    case 'Perpanjangan Kontrak':
      return t.kontrak ? `Kontrak ke-${t.kontrak.ke}, ${t.kontrak.bulan} bulan: ${formatDate(t.kontrak.mulai)} – ${formatDate(t.kontrak.akhir)}` : '—'
    case 'Pengangkatan Tetap':
      return `${b.statusKerja} → ${a.statusKerja}`
    case 'Rotasi':
      parts.push(`Section ${diff(b.section, a.section)}`)
      if (a.posisi !== b.posisi) parts.push(diff(b.posisi, a.posisi))
      return parts.join(' · ')
    case 'Mutasi':
      parts.push(diff(placeText(b), placeText(a)))
      if (a.posisi !== b.posisi) parts.push(diff(b.posisi, a.posisi))
      return parts.join(' · ')
    case 'Pindah Kategori':
      parts.push(`${b.jenis} → ${a.jenis}${a.statusKerja === 'Kontrak' && t.kontrak ? ` (Kontrak ${t.kontrak.bulan} bulan)` : a.statusKerja === 'Tetap' ? ' (Tetap)' : ''}`)
      if (a.kelompok !== b.kelompok) parts.push(diff(b.kelompok, a.kelompok))
      return parts.join(' · ')
    default:
      parts.push(diff(b.posisi, a.posisi))
      if (a.kelompok !== b.kelompok) parts.push(diff(b.kelompok, a.kelompok))
      if (showPay && t.gaji) parts.push(`Gaji Pokok ${t.gaji.baru >= t.gaji.lama ? '+' : '−'} ${idr(Math.abs(t.gaji.baru - t.gaji.lama))}`)
      return parts.join(' · ')
  }
}

/* ---------- siklus hidup ---------- */
function rebuildState() {
  const flags: Record<string, ContractFlag> = {}
  const extra: Record<string, Contract[]> = {}
  const cuts: Record<string, { tanggal: string; trxNo: string }> = {}
  const flag = (nik: string) => (flags[nik] ??= {})
  for (const t of TRX) {
    if (t.jenis !== 'Perpanjangan Kontrak' && t.jenis !== 'Pengangkatan Tetap' && t.jenis !== 'Pindah Kategori') continue
    if (t.status === 'menunggu' && t.jenis !== 'Pindah Kategori') flag(t.nik).pending = t.jenis === 'Perpanjangan Kontrak' ? 'Perpanjangan diajukan' : 'Pengangkatan diajukan'
    if (t.status !== 'disetujui') continue
    if (t.jenis === 'Perpanjangan Kontrak' && t.kontrak) {
      ;(extra[t.nik] ??= []).push({ ...t.kontrak, trxNo: t.no })
      if (!t.applied) Object.assign(flag(t.nik), { handled: true, ext: t.kontrak.akhir })
    }
    if (t.jenis === 'Pindah Kategori' && t.kontrak) (extra[t.nik] ??= []).push({ ...t.kontrak, trxNo: t.no })
    if (t.jenis === 'Pengangkatan Tetap') {
      if (!t.applied) Object.assign(flag(t.nik), { handled: true, tetapFrom: t.efektif })
      else cuts[t.nik] = { tanggal: t.efektif, trxNo: t.no }
    }
  }
  for (const k of Object.keys(CONTRACT_FLAGS)) delete CONTRACT_FLAGS[k]
  Object.assign(CONTRACT_FLAGS, flags)
  setContractOverlay(extra, cuts)
}

/** Terapkan perubahan data pegawai pada tanggal efektif: record pegawai berubah dan riwayat bertambah (dibangkitkan dari TRX). */
function applyTrx(t: Trx) {
  const e = empOf(t.nik)
  if (!e) return
  const a = t.sesudah
  const multi = (orgById(orgById(a.sec)?.parentId ?? null) ? sectionNodesOf(a.department).length : 0) > 1
  Object.assign(e, {
    department: a.department,
    sec: a.sec,
    section: multi ? a.section : undefined,
    posisi: a.posisi,
    level: a.level,
    grade: a.grade,
    jenis: a.jenis,
    statusKerja: a.statusKerja,
    kelompok: a.kelompok,
    tanggalAkhir: a.tanggalAkhir || undefined,
    atasanId: a.atasanId,
    tunjanganTetap: tunjanganAt(a.level, DEMO_TODAY),
  })
  t.applied = true
}
/** Terapkan semua transaksi Disetujui yang tanggal efektifnya sudah tiba. */
export function applyDue() {
  const due = TRX.filter((t) => t.status === 'disetujui' && !t.applied && t.efektif <= DEMO_TODAY).sort((x, y) => x.efektif.localeCompare(y.efektif))
  for (const t of due) applyTrx(t)
  if (due.length) syncRoster()
  rebuildState()
}

export function submitTrx(input: TrxInput, actor: CurrentUser): { no?: string; errors?: Record<string, string> } {
  const p = previewTrx(input)
  if (!p) return { errors: { nik: 'Pegawai wajib dipilih' } }
  const reason = ineligibleReason(input.jenis, p.emp)
  const errors = { ...p.errors, ...(reason ? { nik: reason } : {}) }
  if (Object.keys(errors).length) return { errors }
  SEQ.trx += 1
  const kind = suratKind(input.jenis)
  SEQ[kind] += 1
  const t: Trx = {
    no: `TRX-2026-${String(SEQ.trx).padStart(4, '0')}`,
    nik: input.nik,
    jenis: input.jenis,
    status: 'menunggu',
    efektif: p.efektif,
    periodeId: p.periodeId,
    sebelum: p.before,
    sesudah: p.after,
    gaji: p.gaji,
    kontrak: p.kontrak,
    alasanDemosi: input.alasanDemosi,
    alasan: input.alasan.trim(),
    lampiran: input.lampiran,
    diajukan: { by: actor.nama, at: nowStamp(), tanggal: DEMO_TODAY },
    steps: stepsFor(p.emp),
    applied: false,
    suratNo: suratNumber(kind, SEQ[kind], DEMO_TODAY),
  }
  TRX.unshift(t)
  rebuildState()
  bump()
  return { no: t.no }
}

/** Setujui langkah berjalan. Langkah terakhir menyetujui transaksi: Perubahan Gaji tertaut dibuat dan, bila tanggalnya sudah tiba, data pegawai berubah. */
export function approveTrx(no: string, actor: CurrentUser) {
  const t = byNo(no)
  const s = t && currentStep(t)
  if (!t || !s || !canReview(t, actor)) return
  s.status = 'disetujui'
  s.by = actor.nama
  s.at = nowStamp()
  if (actor.role === 'manager' && s.personId !== 'manager') s.mewakili = s.person
  if (!currentStep(t)) {
    t.status = 'disetujui'
    t.keputusan = { by: actor.nama, at: nowStamp() }
    if (t.gaji) {
      t.perubahanGajiNo = recordApprovedChange(
        { nik: t.nik, lama: t.gaji.lama, baru: t.gaji.baru, berlaku: t.efektif, alasan: t.no },
        t.jenis === 'Promosi' ? 'Promosi' : 'Lainnya',
        `Dari Transaksi Kepegawaian ${t.no} (${t.jenis})`,
        { by: t.diajukan.by, at: t.diajukan.at },
        { by: actor.nama, at: nowStamp() },
      )
    }
    applyDue()
    bumpPayroll()
  }
  rebuildState()
  // Perpanjangan disetujui: kontrak yang berakhir mendapat Kompensasi PKWT (Hak Akhir).
  if (t.status === 'disetujui' && t.jenis === 'Perpanjangan Kontrak') {
    const ending = contractsOf(t.nik).filter((c) => c.trxNo !== t.no).at(-1)
    if (ending) kpkHook.onExtended(t.nik, ending)
  }
  bump()
}

export function rejectTrx(no: string, actor: CurrentUser, alasan: string) {
  const t = byNo(no)
  const s = t && currentStep(t)
  if (!t || !s || !canReview(t, actor)) return
  s.status = 'ditolak'
  s.by = actor.nama
  s.at = nowStamp()
  s.alasan = alasan
  t.status = 'ditolak'
  t.keputusan = { by: actor.nama, at: nowStamp(), alasan }
  rebuildState()
  bump()
}

export function cancelTrx(no: string, actor: CurrentUser, alasan: string) {
  const t = byNo(no)
  if (!t || !canCancel(t, actor)) return
  t.status = 'dibatalkan'
  t.keputusan = { by: actor.nama, at: nowStamp(), alasan }
  rebuildState()
  bump()
}

/* ---------- daftar kontrak ≤ 45 hari ---------- */
export type ExpiringRow = { emp: RosterEmployee; sisa: number; ke: number; total: number; pending?: ContractFlag['pending']; ending?: 'diajukan' | 'diproses' }
/** Satu sumber untuk Dashboard, Direktori, dan halaman ini: Kontrak aktif berakhir ≤ 45 hari, tanpa yang sudah ditangani. */
export function expiringContracts(filter?: (e: RosterEmployee) => boolean): ExpiringRow[] {
  return ROSTER.filter((e) => {
    if (!isActive(e) || e.statusKerja !== 'Kontrak' || !e.tanggalAkhir || CONTRACT_FLAGS[e.nik]?.handled) return false
    const d = daysFromToday(e.tanggalAkhir)
    return d >= 0 && d <= CONTRACT_WARN_DAYS && (!filter || filter(e))
  })
    .sort((a, b) => a.tanggalAkhir!.localeCompare(b.tanggalAkhir!) || a.nik.localeCompare(b.nik))
    .map((emp) => ({ emp, sisa: daysFromToday(emp.tanggalAkhir!), ke: contractsOf(emp.nik).length, total: totalContractMonths(emp.nik), pending: CONTRACT_FLAGS[emp.nik]?.pending, ending: CONTRACT_ENDING[emp.nik] }))
}

/* ---------- Riwayat Kepegawaian ---------- */
export type RiwayatEntry = { tanggal: string; judul: string; detail: string; trxNo?: string; suratNo?: string; terjadwal?: boolean }
export function riwayatOf(nik: string, showPay: boolean): RiwayatEntry[] {
  const e = empOf(nik)
  const exit = exitRecord(nik)
  const exitEntry: RiwayatEntry[] = exit ? [{ tanggal: exit.tanggalKeluar, judul: `Keluar · ${exit.reason}`, detail: `Tanggal keluar ${formatDate(exit.tanggalKeluar)} · nonaktif sejak ${formatDate(addDayIso(exit.tanggalKeluar))}`, trxNo: exit.no, suratNo: exit.skkNo, terjadwal: exit.tanggalKeluar >= DEMO_TODAY }] : []
  if (!e) {
    const px = personOf(nik)
    return px ? [...exitEntry, { tanggal: px.tanggalMasuk, judul: 'Masuk', detail: `${px.posisi} · ${px.department}` }] : []
  }
  const list = TRX.filter((t) => t.nik === nik && t.status === 'disetujui')
  const oldest = [...list].sort((a, b) => a.efektif.localeCompare(b.efektif))[0]
  const first = oldest ? oldest.sebelum : placementOf(e)
  const out: RiwayatEntry[] = [{ tanggal: e.tanggalMasuk, judul: 'Masuk', detail: `${first.posisi} · ${placeText(first)}` }]
  for (const c of contractsOf(nik)) {
    if (c.trxNo) continue
    out.push({ tanggal: c.mulai, judul: `Kontrak ke-${c.ke}`, detail: `${formatDate(c.mulai)} – ${formatDate(c.akhir)} · ${c.bulan} bulan${c.diakhiri ? ` · diakhiri lebih awal (${c.diakhiri.trxNo}): Digantikan pengangkatan tetap` : ''}` })
  }
  const contracts = contractsOf(nik)
  for (const t of list) {
    const c = t.kontrak && contracts.find((x) => x.trxNo === t.no)
    out.push({
      tanggal: t.efektif,
      judul: c && t.jenis === 'Perpanjangan Kontrak' ? `${t.jenis} · Kontrak ke-${c.ke}` : t.jenis,
      detail: c && t.jenis === 'Perpanjangan Kontrak' ? `${formatDate(c.mulai)} – ${formatDate(c.akhir)} · ${c.bulan} bulan` : changeLine(t, showPay),
      trxNo: t.no,
      suratNo: t.suratNo,
      terjadwal: !t.applied,
    })
  }
  return [...out, ...exitEntry].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.judul === 'Masuk' ? 1 : -1))
}

export const pendingCount = () => TRX.filter((t) => t.status === 'menunggu').length
export const inMonth = (t: Trx) => t.status === 'disetujui' && t.efektif.slice(0, 7) === DEMO_TODAY.slice(0, 7) && t.efektif <= DEMO_TODAY
export const effectiveInPeriod = (t: Trx, dari: string, sampai: string) => t.status === 'disetujui' && t.efektif >= dari && t.efektif <= sampai

/* ---------- seed ---------- */
const ADM = 'Teddy Syahputra'
const approvedSteps = (e: RosterEmployee, first: string, at1: string, at2: string): TrxStep[] => {
  const base = stepsFor(e)
  return base.map((s, i) => ({ ...s, status: 'disetujui', by: s.person, at: i === 0 && base.length > 1 ? at1 : at2 }))
}
function seed() {
  const get = (nik: string) => empOf(nik)!
  const siti = get('PPI-2024-0127')
  const yusuf = get('PPI-2024-0093')
  const bayu = get('PPI-2025-0068')
  const arif = get('PPI-2022-0061')

  // Bekas pegawai Harian di Warehouse yang kini Organik Non Staff (Kontrak 12 bulan sejak periode Agustus 2026).
  // Tidak ada pegawai Organik Kontrak di Warehouse selain Dedi Kurniawan, jadi satu pegawai Organik Tetap Warehouse dan satu
  // pegawai Organik Kontrak di department lain bertukar status agar jumlah Tetap 156 dan Kontrak 92 tidak berubah.
  const pk = ROSTER.filter((e) => e.gen && e.department === 'Warehouse' && (e.jenis ?? 'Organik') === 'Organik' && e.kelompok === 'Non Staff' && e.statusKerja === 'Tetap')
    .sort((a, b) => b.tanggalMasuk.localeCompare(a.tanggalMasuk) || a.nik.localeCompare(b.nik))[0]
  const partner = ROSTER.filter((e) => e.gen && e.department !== 'Warehouse' && e.department !== 'HR & GA' && (e.jenis ?? 'Organik') === 'Organik' && e.statusKerja === 'Kontrak' && !!e.tanggalAkhir)
    .sort((a, b) => b.tanggalAkhir!.localeCompare(a.tanggalAkhir!) || a.nik.localeCompare(b.nik))[0]
  if (pk && partner) {
    Object.assign(partner, { statusKerja: 'Tetap', tanggalAkhir: undefined })
    setSeedContracts(partner.nik, [])
    const m = memberOf(partner.nik)
    if (m) m.statusKerja = 'Tetap'
  }

  const pa = periodForId('2026-08')
  const sNow = placementOf(siti)
  const kontrak48: TrxKontrak = { ke: 3, mulai: '2026-11-13', akhir: '2027-11-12', bulan: 12 }
  TRX.push({
    no: 'TRX-2026-0048', nik: siti.nik, jenis: 'Perpanjangan Kontrak', status: 'menunggu', efektif: '2026-11-13',
    sebelum: sNow, sesudah: { ...sNow, tanggalAkhir: kontrak48.akhir }, kontrak: kontrak48,
    alasan: 'Kinerja baik dan posisi QC Inspector shift siang masih dibutuhkan.',
    diajukan: { by: ADM, at: '20 Okt 2026, 10.15 WIB', tanggal: '2026-10-20' }, steps: stepsFor(siti), applied: false,
    suratNo: suratNumber('PKWT', 14, '2026-10-20'),
  })

  const yNow = placementOf(yusuf)
  TRX.push({
    no: 'TRX-2026-0047', nik: yusuf.nik, jenis: 'Promosi', status: 'menunggu', efektif: periodForId('2026-12').start, periodeId: '2026-12',
    sebelum: yNow,
    sesudah: { ...yNow, posisi: 'Leader Injection', level: 'Leader', grade: 'G3', kelompok: 'Staff' },
    gaji: { lama: yusuf.gajiPokok, baru: yusuf.gajiPokok + 450_000 },
    alasan: 'Hasil evaluasi kinerja 2026 sangat baik dan siap memimpin satu shift Injection.',
    diajukan: { by: ADM, at: '22 Okt 2026, 14.20 WIB', tanggal: '2026-10-22' }, steps: stepsFor(yusuf), applied: false,
    suratNo: suratNumber('SK', 39, '2026-10-22'),
  })

  const bNow = placementOf(bayu)
  const bBefore = { ...bNow, sec: 'SEC-MEK', section: 'Mekanik', posisi: 'Teknisi Mekanik' }
  TRX.push({
    no: 'TRX-2026-0041', nik: bayu.nik, jenis: 'Rotasi', status: 'disetujui', efektif: '2026-10-01',
    sebelum: bBefore, sesudah: bNow,
    alasan: 'Penyeimbangan kebutuhan teknisi di Section Elektrik.',
    diajukan: { by: ADM, at: '22 Sep 2026, 09.30 WIB', tanggal: '2026-09-22' },
    steps: approvedSteps(bayu, 'Teguh Santoso', '23 Sep 2026, 08.40 WIB', '24 Sep 2026, 10.05 WIB'), applied: true,
    keputusan: { by: 'Lestari Wulandari', at: '24 Sep 2026, 10.05 WIB' }, suratNo: suratNumber('SK', 32, '2026-09-22'),
  })

  const aNow = placementOf(arif)
  TRX.push({
    no: 'TRX-2026-0033', nik: arif.nik, jenis: 'Pengangkatan Tetap', status: 'disetujui', efektif: '2026-06-01',
    sebelum: { ...aNow, statusKerja: 'Kontrak', tanggalAkhir: '2026-09-13' }, sesudah: aNow,
    alasan: 'Memenuhi syarat masa kerja dan hasil evaluasi kinerja.',
    diajukan: { by: ADM, at: '12 Mei 2026, 11.00 WIB', tanggal: '2026-05-12' },
    steps: approvedSteps(arif, 'Rudi Hartanto', '13 Mei 2026, 09.10 WIB', '14 Mei 2026, 13.30 WIB'), applied: true,
    keputusan: { by: 'Lestari Wulandari', at: '14 Mei 2026, 13.30 WIB' }, suratNo: suratNumber('SK', 18, '2026-05-12'),
  })

  if (pk && partner) {
    const akhir = contractEnd(pa.start, 12)
    pk.statusKerja = 'Kontrak'
    pk.tanggalAkhir = akhir
    const mk = memberOf(pk.nik)
    if (mk) mk.statusKerja = 'Kontrak'
    setSeedContracts(pk.nik, [])
    const pNow = placementOf(pk)
    TRX.push({
      no: 'TRX-2026-0029', nik: pk.nik, jenis: 'Pindah Kategori', status: 'disetujui', efektif: pa.start, periodeId: '2026-08',
      sebelum: { ...pNow, jenis: 'Harian', kelompok: 'Harian', statusKerja: 'Kontrak', tanggalAkhir: '2026-07-20' }, sesudah: pNow,
      kontrak: { ke: 1, mulai: pa.start, akhir, bulan: 12 },
      alasan: 'Penyesuaian kebutuhan gudang: pegawai harian diangkat menjadi pegawai organik kontrak.',
      diajukan: { by: ADM, at: '30 Jun 2026, 15.00 WIB', tanggal: '2026-06-30' },
      steps: approvedSteps(pk, 'Bambang Hermawan', '1 Jul 2026, 08.50 WIB', '2 Jul 2026, 09.45 WIB'), applied: true,
      keputusan: { by: 'Lestari Wulandari', at: '2 Jul 2026, 09.45 WIB' }, suratNo: suratNumber('SK', 21, '2026-06-30'),
    })
  }
}
seed()
rebuildState()

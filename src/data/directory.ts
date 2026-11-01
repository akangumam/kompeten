import { can } from '@/lib/access'
import { type Candidate } from '@/data/candidates'
import { offerOf } from '@/data/recruitment/offers'
import { DEMO_TODAY } from '@/lib/today'
import {
  daysFromToday,
  CONTRACT_WARN_DAYS,
  contractHandled,
  emptyRequired,
  makeRecord,
  ROSTER,
  SUPERVISORS,
  type DraftRecord,
  type RosterEmployee,
  type ShiftId,
} from '@/data/employees'
import { departmentNodes, ORG, orgById } from '@/data/master/organization'
import { polaOfDept } from '@/data/master/shifts'
import { jenisOf } from '@/data/master/jenis'
import { nearRetirement } from '@/data/master/retirement'
import { birthOf, EXITED, type ExitReason } from '@/data/profiles'
import { atasanKey } from '@/data/roster-gen'
import { exitRecord, hasLeft, scheduledExit } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'

export type EmpStatus = 'Aktif' | 'Akan Bergabung' | 'Draft' | 'Nonaktif'
export type DirTab = 'aktif' | 'bergabung' | 'draft' | 'nonaktif'
export const TAB_STATUS: Record<DirTab, EmpStatus> = {
  aktif: 'Aktif',
  bergabung: 'Akan Bergabung',
  draft: 'Draft',
  nonaktif: 'Nonaktif',
}
export const TABS: DirTab[] = ['aktif', 'bergabung', 'draft', 'nonaktif']

export type DirRef = { type: 'roster' | 'exited' | 'draft'; key: string }

export type DirRow = {
  id: string
  ref: DirRef
  status: EmpStatus
  nik: string
  nama: string
  department: string
  section: string
  posisi: string
  level: string
  grade: string
  jenis: string
  /** Tanggal lahir (untuk filter mendekati pensiun). */
  lahir?: string
  statusKerja: string
  /** Group Kerja (golongan). */
  kelompok: string
  tanggalMasuk: string
  tanggalAkhir: string
  atasanId: string
  shift?: ShiftId
  keluar?: { tanggal: string; alasan: ExitReason; keterangan?: string }
  /** Offboarding selesai dengan tanggal keluar di masa depan: nonaktif mulai tanggal ini. */
  terjadwalNonaktif?: string
  asal?: string
  dibuat?: string
  kosong?: number
}

/** Filter tambahan yang hanya datang dari drill-down (Data Master). */
export type DirExtra = { posisi?: string; grade?: string; shift?: ShiftId; pola?: 5 | 6; divisi?: string }

export type DirFilters = {
  tab: DirTab
  q: string
  department: string
  section: string
  jenis: string
  statusKerja: string
  kelompok: string
  level: string
  kontrak45: boolean
  pensiun: boolean
  extra: DirExtra
}
export const ALL = 'all'
export const DEFAULT_FILTERS: DirFilters = {
  tab: 'aktif',
  q: '',
  department: ALL,
  section: ALL,
  jenis: ALL,
  statusKerja: ALL,
  kelompok: ALL,
  level: ALL,
  kontrak45: false,
  pensiun: false,
  extra: {},
}
export type DirPreset = Partial<DirFilters>

const sectionName = (e: RosterEmployee) => orgById(e.sec)?.nama ?? e.section ?? ''
const statusByDate = (masuk: string): EmpStatus => (masuk > DEMO_TODAY ? 'Akan Bergabung' : 'Aktif')

export const rosterRow = (e: RosterEmployee): DirRow => ({
  id: e.nik,
  ref: { type: 'roster', key: e.nik },
  status: hasLeft(e.nik) ? 'Nonaktif' : statusByDate(e.tanggalMasuk),
  keluar: hasLeft(e.nik) ? { tanggal: exitRecord(e.nik)!.tanggalKeluar, alasan: exitRecord(e.nik)!.reason, keterangan: exitRecord(e.nik)!.keterangan || undefined } : undefined,
  terjadwalNonaktif: scheduledExit(e.nik) ? new Date(Date.parse(`${scheduledExit(e.nik)!.tanggalKeluar}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : undefined,
  nik: e.nik,
  nama: e.nama,
  department: e.department,
  section: sectionName(e),
  posisi: e.posisi,
  level: e.level,
  grade: e.grade,
  jenis: jenisOf(e),
  lahir: birthOf(e),
  statusKerja: e.statusKerja,
  kelompok: e.kelompok,
  tanggalMasuk: e.tanggalMasuk,
  tanggalAkhir: e.tanggalAkhir ?? '',
  atasanId: e.atasanId,
  shift: e.shift,
})

const EXITED_ROWS: DirRow[] = EXITED.map((e) => ({
  ...rosterRow(e),
  ref: { type: 'exited', key: e.nik },
  status: e.keluar.tanggal <= DEMO_TODAY ? 'Nonaktif' : 'Aktif',
  keluar: e.keluar,
}))

/** Atasan default sebuah penempatan = kepala section, atau kepala department bila section kosong. */
export function atasanForPlacement(department: string, section: string): string {
  const dep = departmentNodes().find((d) => d.nama === department)
  if (!dep) return ''
  const sec = section ? ORG.find((o) => o.jenis === 'Section' && o.parentId === dep.id && o.nama === section) : undefined
  return atasanKey((sec ?? dep).kepalaNik)
}

export function buildDirectory(drafts: Record<string, DraftRecord>, candidates: Candidate[]): DirRow[] {
  // Dibangkitkan ulang setiap kali: record pegawai berubah pada tanggal efektif Transaksi Kepegawaian.
  const rows: DirRow[] = [...ROSTER.map(rosterRow), ...EXITED_ROWS]
  const fromRecord = (key: string, rec: DraftRecord, c?: Candidate) => {
    const f = rec.form
    const base = {
      ref: { type: 'draft', key } as DirRef,
      nama: f.nama || 'Tanpa nama',
      department: f.department,
      section: f.section,
      posisi: f.posisi || c?.posisi || '',
      level: f.level,
      grade: '',
      jenis: f.jenis || 'Organik',
      lahir: f.tanggalLahir,
      statusKerja: f.statusKerja,
      kelompok: f.kelompok,
      tanggalMasuk: f.tanggalMasuk,
      tanggalAkhir: f.tanggalAkhir,
      atasanId: atasanForPlacement(f.department, f.section),
    }
    if (rec.status === 'aktif') {
      rows.push({ ...base, id: rec.nik ?? key, status: statusByDate(f.tanggalMasuk), nik: rec.nik ?? '' })
    } else {
      rows.push({
        ...base,
        id: key,
        status: 'Draft',
        nik: '',
        asal: c ? c.id : 'Input langsung',
        dibuat: c?.draftCreatedAt ?? rec.createdAt ?? DEMO_TODAY,
        kosong: emptyRequired(f).length,
      })
    }
  }
  for (const c of candidates) {
    if (!c.draftCreatedAt) continue
    fromRecord(c.id, drafts[c.id] ?? makeRecord(c, offerOf(c.offerId)), c)
  }
  for (const [key, rec] of Object.entries(drafts)) {
    if (rec.source === 'langsung') fromRecord(key, rec)
  }
  return rows
}

/** Ruang lingkup: Atasan hanya melihat unit kerjanya sendiri (department · section). */
export function teamOf(user: CurrentUser) {
  const me = ROSTER.find((e) => e.nik === user.nik)
  return me ? { department: me.department, section: sectionName(me) } : null
}
export function scopeRows(allRows: DirRow[], user: CurrentUser): DirRow[] {
  let rows = allRows
  if (!can(user, 'draft.view')) rows = rows.filter((r) => r.status !== 'Draft') // draft hanya untuk HR Recruitment, HR Personalia, HR & GA Manager
  if (user.role !== 'supervisor') return rows
  const t = teamOf(user)
  return rows.filter((r) => (r.status === 'Aktif' || r.status === 'Akan Bergabung') && !!t && r.department === t.department && r.section === t.section)
}

export const divisiOf = (department: string) => orgById(departmentNodes().find((d) => d.nama === department)?.parentId ?? null)?.nama ?? ''

export const isKontrak45 = (r: DirRow) => {
  if (r.status !== 'Aktif' && r.status !== 'Akan Bergabung') return false
  if (r.statusKerja !== 'Kontrak' || !r.tanggalAkhir || contractHandled(r.nik)) return false
  const d = daysFromToday(r.tanggalAkhir)
  return d >= 0 && d <= CONTRACT_WARN_DAYS
}

/** Terapkan semua filter kecuali tab, supaya hitungan tab ikut filter lain. */
export function filterRows(rows: DirRow[], f: DirFilters): DirRow[] {
  const q = f.q.trim().toLowerCase()
  const x = f.extra
  return rows.filter((r) => {
    if (q && !r.nama.toLowerCase().includes(q) && !r.nik.toLowerCase().includes(q)) return false
    if (f.department !== ALL && r.department !== f.department) return false
    if (f.section !== ALL && r.section !== f.section) return false
    if (f.jenis !== ALL && r.jenis !== f.jenis) return false
    if (f.statusKerja !== ALL && r.statusKerja !== f.statusKerja) return false
    if (f.kelompok !== ALL && r.kelompok !== f.kelompok) return false
    if (f.level !== ALL && r.level !== f.level) return false
    if (f.kontrak45 && !isKontrak45(r)) return false
    if (f.pensiun && !(r.status === 'Aktif' && r.lahir && nearRetirement(r.lahir))) return false
    if (x.posisi && r.posisi !== x.posisi) return false
    if (x.grade && r.grade !== x.grade) return false
    if (x.shift && r.shift !== x.shift) return false
    if (x.pola && polaOfDept(r.department) !== x.pola) return false
    if (x.divisi && divisiOf(r.department) !== x.divisi) return false
    return true
  })
}

export const hasActiveFilter = (f: DirFilters) =>
  f.q !== '' ||
  f.department !== ALL ||
  f.section !== ALL ||
  f.jenis !== ALL ||
  f.statusKerja !== ALL ||
  f.kelompok !== ALL ||
  f.level !== ALL ||
  f.kontrak45 ||
  f.pensiun ||
  Object.values(f.extra).some((v) => v !== undefined)

/** Masa kerja dalam bulan penuh; null bila belum bergabung. */
export function tenureMonths(masuk: string, today = DEMO_TODAY): number | null {
  if (!masuk || masuk > today) return null
  const [y1, m1, d1] = masuk.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
}
export function formatTenure(masuk: string, today = DEMO_TODAY): string {
  const m = tenureMonths(masuk, today)
  if (m === null) return '—'
  const y = Math.floor(m / 12)
  const b = m % 12
  if (y === 0 && b === 0) return '< 1 bln'
  return [y > 0 ? `${y} thn` : '', b > 0 ? `${b} bln` : ''].filter(Boolean).join(' ')
}
export const formatTenureBetween = (masuk: string, keluar: string) => formatTenure(masuk, keluar)

export const atasanName = (id: string) => SUPERVISORS.find((s) => s.id === id)?.nama ?? '—'
export const atasanOfRow = (r: DirRow) => atasanName(r.atasanId)

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
/** CSV ekspor Direktori. Sengaja tanpa KTP, NPWP, BPJS, dan rekening. */
export function directoryCsv(rows: DirRow[]): string {
  const head = ['NIP', 'Nama', 'Department', 'Section', 'Posisi', 'Level', 'Jenis Karyawan', 'Group Kerja', 'Status Kerja', 'Tanggal Masuk', 'Tanggal Berakhir Kontrak', 'Atasan']
  const body = rows.map((r) =>
    [r.nik, r.nama, r.department, r.section, r.posisi, r.level, r.jenis, r.kelompok, r.statusKerja, r.tanggalMasuk, r.tanggalAkhir, atasanOfRow(r)].map(csvCell).join(','),
  )
  return [head.join(','), ...body].join('\r\n') + '\r\n'
}
export const exportFilename = () => `direktori-pegawai-${DEMO_TODAY.replace(/-/g, '')}.csv`

import { MIN_PENCAIRAN, SUKARELA_STEP } from '@/data/koperasi/settings'
import { jenisOf } from '@/data/master/jenis'
import { nowStamp } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import { addMonths } from '@/data/koperasi/dates'
import { balanceOf, postMutation } from '@/data/koperasi/ledger'
import { addMember, changesOf, ELIGIBLE_JENIS, memberOf, nominalAt, pushStep, setoranNow, STEP, WAJIB_MIN, type SetoranJenis } from '@/data/koperasi/members'
import { stageActor } from '@/data/koperasi/ksb'
import { bump } from '@/data/koperasi/store'
import { PAYROLL_PERIOD } from '@/data/payroll/period'
import { maskRekening, salaryAt } from '@/data/payroll/salaries'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)
const nameOf = (nik: string) => empOf(nik)?.nama ?? memberOf(nik)?.nama ?? nik

type Decision = { oleh: string; tanggal: string; alasan?: string }

/* ============================ Pendaftaran ============================ */
export type RegStatus = 'menunggu' | 'disetujui' | 'ditolak'
export type Registration = {
  id: string
  nik: string
  nama: string
  department: string
  statusKerja: string
  wajib: number
  sukarela: number
  diajukan: string
  diinputOleh: string
  status: RegStatus
  keputusan?: Decision
}
export const REGISTRATIONS: Registration[] = [
  { id: 'REG-2026-0011', nik: 'PPI-2025-0071', nama: 'Lukman Hakim', department: 'Produksi', statusKerja: 'Kontrak', wajib: 50_000, sukarela: 0, diajukan: '2026-10-20', diinputOleh: 'Ratna Dewi', status: 'menunggu' },
  { id: 'REG-2026-0012', nik: 'PPI-2025-0068', nama: 'Bayu Setiawan', department: 'Maintenance', statusKerja: 'Kontrak', wajib: 50_000, sukarela: 0, diajukan: '2026-10-22', diinputOleh: 'Ratna Dewi', status: 'menunggu' },
]
let regSeq = 13

/** Pegawai yang belum aktif dan tampil di pilihan pendaftaran sebagai tidak memenuhi syarat (kandidat Draft Pegawai). */
export const NOT_ACTIVE = [{ nik: 'LMR-2026-0143', nama: 'Andi Saputra', department: 'Kandidat · Draft Pegawai', statusKerja: '—' }]

export type Candidate = { nik: string; nama: string; department: string; statusKerja: string; jenis: string; reason: string }
/** Alasan pegawai tidak bisa didaftarkan; string kosong bila memenuhi syarat. */
export function eligibilityReason(nik: string, jenis: string, aktif = true): string {
  if (!aktif) return 'Belum menjadi pegawai aktif'
  if (!ELIGIBLE_JENIS.includes(jenis)) return `Karyawan ${jenis} tidak dapat menjadi anggota koperasi`
  if (memberOf(nik)) return 'Sudah menjadi anggota'
  if (REGISTRATIONS.some((r) => r.nik === nik && r.status === 'menunggu')) return 'Pendaftaran sedang diproses'
  return ''
}
export function registrationCandidates(): Candidate[] {
  const list: Candidate[] = ROSTER.filter((e) => !memberOf(e.nik)).map((e) => ({ nik: e.nik, nama: e.nama, department: e.department, statusKerja: e.statusKerja, jenis: jenisOf(e), reason: eligibilityReason(e.nik, jenisOf(e)) }))
  for (const n of NOT_ACTIVE) list.push({ ...n, jenis: '—', reason: eligibilityReason(n.nik, '—', false) })
  return list.sort((a, b) => Number(!!a.reason) - Number(!!b.reason) || a.nama.localeCompare(b.nama, 'id'))
}

export const validWajib = (n: number) => n >= WAJIB_MIN && n % STEP === 0
export const validSukarela = (n: number) => n >= 0 && n % SUKARELA_STEP === 0

export function createRegistration(input: { nik: string; wajib: number; sukarela: number }, by: string): string {
  const c = registrationCandidates().find((x) => x.nik === input.nik)
  if (!c) return 'Pegawai tidak ditemukan'
  if (c.reason) return c.reason
  REGISTRATIONS.unshift({ id: `REG-2026-${String(regSeq++).padStart(4, '0')}`, nik: c.nik, nama: c.nama, department: c.department, statusKerja: c.statusKerja, wajib: input.wajib, sukarela: input.sukarela, diajukan: DEMO_TODAY, diinputOleh: by, status: 'menunggu' })
  bump()
  return ''
}
export function decideRegistration(id: string, approve: boolean, alasan: string, by: string) {
  const r = REGISTRATIONS.find((x) => x.id === id)
  if (!r || r.status !== 'menunggu') return
  r.status = approve ? 'disetujui' : 'ditolak'
  r.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan: approve ? undefined : alasan }
  if (approve) addMember({ nik: r.nik, nama: r.nama, department: r.department, statusKerja: r.statusKerja, wajib: r.wajib, sukarela: r.sukarela }, DEMO_TODAY)
  bump()
}
export const pendingRegistrations = () => REGISTRATIONS.filter((r) => r.status === 'menunggu')

/* ========================= Perubahan setoran ========================= */
export type ChangeStatus = 'menunggu' | 'disetujui' | 'ditolak'
export type ChangeReq = {
  id: string
  nik: string
  jenis: SetoranJenis
  lama: number
  baru: number
  berlaku: string
  diajukan: string
  oleh: string
  alasan: string
  status: ChangeStatus
  keputusan?: Decision
}
export const CHANGES: ChangeReq[] = [
  { id: 'UST-2026-0021', nik: 'PPI-2022-0045', jenis: 'Wajib', lama: 50_000, baru: 100_000, berlaku: '2026-11-01', diajukan: '2026-10-23', oleh: 'Ratna Dewi', alasan: 'Anggota ingin menambah simpanan wajib bulanan', status: 'menunggu' },
  { id: 'UST-2026-0018', nik: 'PPI-2024-0127', jenis: 'Sukarela', lama: 100_000, baru: 0, berlaku: '2026-10-01', diajukan: '2026-09-20', oleh: 'Ratna Dewi', alasan: 'Anggota menghentikan setoran sukarela', status: 'disetujui', keputusan: { oleh: 'Ratna Dewi', tanggal: '2026-09-22' } },
  { id: 'UST-2026-0009', nik: 'PPI-2023-0088', jenis: 'Sukarela', lama: 200_000, baru: 0, berlaku: '2026-07-01', diajukan: '2026-06-20', oleh: 'Ratna Dewi', alasan: 'Anggota menghentikan setoran sukarela', status: 'disetujui', keputusan: { oleh: 'Ratna Dewi', tanggal: '2026-06-22' } },
]
let ustSeq = 22
/** Perubahan nominal berlaku mulai payroll periode berikutnya (tanggal 1 bulan periode itu). */
export const nextPayroll = () => ({ berlaku: `${PAYROLL_PERIOD.bayar.slice(0, 7)}-01`, label: `Payroll ${PAYROLL_PERIOD.label}` })
/** Jeda minimum antarperubahan (bulan): Wajib 3, Sukarela 2. */
export const COOLDOWN: Record<SetoranJenis, number> = { Wajib: 3, Sukarela: 2 }

/** Alasan perubahan ditolak sistem; string kosong bila boleh. */
export function changeBlock(nik: string, jenis: SetoranJenis, berlaku = nextPayroll().berlaku): string {
  const m = memberOf(nik)
  if (!m) return 'Anggota tidak ditemukan'
  if (m.status !== 'aktif') return 'Anggota sudah nonaktif'
  if (CHANGES.some((c) => c.nik === nik && c.jenis === jenis && c.status === 'menunggu')) return `Sudah ada perubahan ${jenis} yang menunggu persetujuan`
  const last = changesOf(m, jenis).at(-1)
  if (!last) return ''
  const earliest = addMonths(last.berlaku, COOLDOWN[jenis])
  return berlaku < earliest ? `Perubahan ${jenis} terakhir berlaku ${formatDate(last.berlaku)}. Paling cepat ${formatDate(earliest)}.` : ''
}
export function createChange(input: { nik: string; jenis: SetoranJenis; baru: number; alasan: string }, by: string): string {
  const block = changeBlock(input.nik, input.jenis)
  if (block) return block
  const m = memberOf(input.nik)!
  CHANGES.unshift({ id: `UST-2026-${String(ustSeq++).padStart(4, '0')}`, nik: input.nik, jenis: input.jenis, lama: setoranNow(m, input.jenis), baru: input.baru, berlaku: nextPayroll().berlaku, diajukan: DEMO_TODAY, oleh: by, alasan: input.alasan.trim(), status: 'menunggu' })
  bump()
  return ''
}
export function decideChange(id: string, approve: boolean, alasan: string, by: string) {
  const c = CHANGES.find((x) => x.id === id)
  if (!c || c.status !== 'menunggu') return
  c.status = approve ? 'disetujui' : 'ditolak'
  c.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan: approve ? undefined : alasan }
  if (approve) pushStep(c.nik, c.jenis, { berlaku: c.berlaku, nominal: c.baru })
  bump()
}
export const pendingChanges = () => CHANGES.filter((c) => c.status === 'menunggu')
export const scheduledChange = (nik: string, jenis: SetoranJenis) => {
  const m = memberOf(nik)
  const next = m ? (jenis === 'Wajib' ? m.wajib : m.sukarela).find((s) => s.berlaku > DEMO_TODAY) : undefined
  return next && m ? { ...next, lama: nominalAt(jenis === 'Wajib' ? m.wajib : m.sukarela, DEMO_TODAY) } : undefined
}

/* ============================== Pencairan ============================== */
export type WdStatus = 'menunggu-ketua' | 'disetujui' | 'dicairkan' | 'ditolak' | 'dibatalkan'
export type Withdrawal = {
  id: string
  nik: string
  nominal: number
  alasan: string
  diajukan: string
  diinputOleh: string
  status: WdStatus
  keputusan?: Decision
  cair?: { oleh: string; tanggal: string; ref: string; bukti: string }
  batal?: Decision
}
export { MIN_PENCAIRAN } from '@/data/koperasi/settings'
export const WITHDRAWALS: Withdrawal[] = [
  { id: 'PCS-2026-0018', nik: 'PPI-2023-0088', nominal: 1_000_000, alasan: 'Keperluan biaya sekolah anak', diajukan: '2026-10-24', diinputOleh: 'Ratna Dewi', status: 'menunggu-ketua' },
  { id: 'PCS-2026-0017', nik: 'PPI-2024-0076', nominal: 500_000, alasan: 'Keperluan renovasi rumah', diajukan: '2026-10-21', diinputOleh: 'Ratna Dewi', status: 'disetujui', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-10-22' } },
  { id: 'PCS-2026-0016', nik: 'PPI-2022-0045', nominal: 300_000, alasan: 'Keperluan keluarga mendesak', diajukan: '2026-10-08', diinputOleh: 'Ratna Dewi', status: 'ditolak', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-10-10', alasan: 'Saldo sukarela tidak mencukupi saat diperiksa' } },
  { id: 'PCS-2026-0009', nik: 'PPI-2023-0088', nominal: 1_500_000, alasan: 'Keperluan biaya berobat', diajukan: '2026-06-10', diinputOleh: 'Ratna Dewi', status: 'dicairkan', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-06-11' }, cair: { oleh: 'Nina Marlina', tanggal: '2026-06-15', ref: 'TRF-150626-001', bukti: 'bukti-transfer-pcs-0009.pdf' } },
]
let pcsSeq = 19

export const RESERVING: WdStatus[] = ['menunggu-ketua', 'disetujui']
export const dipesan = (nik: string) => WITHDRAWALS.filter((w) => w.nik === nik && RESERVING.includes(w.status)).reduce((a, w) => a + w.nominal, 0)
export const saldoSukarela = (nik: string) => balanceOf(nik).Sukarela
/** Saldo tersedia = saldo sukarela − dipesan (pencairan yang belum selesai). */
export const tersedia = (nik: string) => saldoSukarela(nik) - dipesan(nik)

export const rekeningOf = (nik: string) => {
  const e = empOf(nik)
  if (!e) return { ada: false, masked: 'Rekening belum ada' }
  const s = salaryAt(e, DEMO_TODAY)
  return { ada: !!s.nomorRekening, masked: maskRekening(s.bank, s.nomorRekening) === 'Belum ada' ? 'Rekening belum ada' : maskRekening(s.bank, s.nomorRekening) }
}

export function withdrawalError(nik: string, nominal: number): string {
  if (!nominal) return 'Nominal wajib diisi'
  if (nominal < MIN_PENCAIRAN) return `Nominal minimal ${rp(MIN_PENCAIRAN)}`
  if (nominal % SUKARELA_STEP !== 0) return `Nominal harus kelipatan ${rp(SUKARELA_STEP)}`
  const av = tersedia(nik)
  if (nominal > av) return `Melebihi saldo tersedia ${rp(av)}`
  return ''
}
export function createWithdrawal(input: { nik: string; nominal: number; alasan: string }, by: string): { id?: string; error?: string } {
  if (!rekeningOf(input.nik).ada) return { error: 'Rekening belum ada' }
  const err = withdrawalError(input.nik, input.nominal)
  if (err) return { error: err }
  const id = `PCS-2026-${String(pcsSeq++).padStart(4, '0')}`
  WITHDRAWALS.unshift({ id, nik: input.nik, nominal: input.nominal, alasan: input.alasan.trim(), diajukan: DEMO_TODAY, diinputOleh: by, status: 'menunggu-ketua' })
  bump()
  return { id }
}
export function decideWithdrawal(id: string, approve: boolean, alasan: string, by: string) {
  const w = WITHDRAWALS.find((x) => x.id === id)
  if (!w || w.status !== 'menunggu-ketua') return
  w.status = approve ? 'disetujui' : 'ditolak'
  w.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan: approve ? undefined : alasan }
  bump()
}
/** Pencairan: transfer ke rekening anggota, lalu satu mutasi debit Sukarela di buku besar. */
export function disburseWithdrawal(id: string, input: { tanggal: string; ref: string; bukti: string }, by: string) {
  const w = WITHDRAWALS.find((x) => x.id === id)
  if (!w || w.status !== 'disetujui') return
  w.status = 'dicairkan'
  w.cair = { oleh: by, ...input }
  postMutation(w.nik, { tanggal: input.tanggal, jenis: 'Sukarela', keterangan: `Pencairan ${w.id}`, debit: w.nominal, kredit: 0, sumber: `Pencairan ${w.id} · Ref. ${input.ref}`, oleh: by })
  bump()
}
export function cancelWithdrawal(id: string, alasan: string, by: string) {
  const w = WITHDRAWALS.find((x) => x.id === id)
  if (!w || !RESERVING.includes(w.status)) return
  w.status = 'dibatalkan'
  w.batal = { oleh: by, tanggal: DEMO_TODAY, alasan }
  bump()
}

export const reviewerOf = (w: Withdrawal) => stageActor('ketua', w.nik)
export const disburserOf = (w: Withdrawal) => stageActor('bendahara', w.nik)
export const stamp = nowStamp
export { nameOf }
export const disbursedThisMonth = () =>
  WITHDRAWALS.filter((w) => w.status === 'dicairkan' && w.cair?.tanggal.slice(0, 7) === DEMO_TODAY.slice(0, 7)).reduce((a, w) => a + w.nominal, 0)

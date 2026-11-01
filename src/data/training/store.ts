import { useSyncExternalStore } from 'react'
import { notify } from '@/data/notifications'
import { PERIODS, ASSESSMENTS, scoreOf, standardFor } from '@/data/competency/assessments'
import { competencyOf } from '@/data/master/competencies'
import { ROSTER } from '@/data/employees'
import { paketOf } from '@/data/recruitment/tests'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'

export type TrainingType = 'Offline' | 'Online' | 'YouTube'
export const TRAINING_TYPES: TrainingType[] = ['Offline', 'Online', 'YouTube']
export type MaterialKind = 'Sesi tatap muka' | 'Video YouTube' | 'Dokumen PDF' | 'Tautan'
export const MATERIAL_KINDS: MaterialKind[] = ['Sesi tatap muka', 'Video YouTube', 'Dokumen PDF', 'Tautan']
export type ProgramStatus = 'Draft' | 'Aktif' | 'Selesai'

export type Material = { id: string; kind: MaterialKind; judul: string; url?: string; file?: { name: string; size: number }; wajib: boolean }
export type Session = { id: string; tanggal: string; mulai: string; selesai: string; lokasi: string; trainer: string }
export type Program = {
  kode: string
  judul: string
  /** Nama pendek untuk chip bukti kompetensi. */
  singkat: string
  tipe: TrainingType
  kompetensi: { kode: string; target: number }[]
  penyelenggara: { jenis: 'Internal' | 'Eksternal'; nama: string }
  durasiJam: number
  materi: Material[]
  sesi: Session[]
  kuota?: number
  paketId?: string
  passing?: number
  status: ProgramStatus
  tahun: number
}

export type MaterialProgress = { status: 'selesai' | 'tervalidasi'; selesai: string; validasi?: { by: string; at: string } }
export type Attempt = { nilai: number; lulus: boolean; tanggal: string; sumber: 'simulasi' | 'aplikasi' }
export type Enrollment = {
  programKode: string
  nik: string
  materi: Record<string, MaterialProgress>
  hadir: Record<string, 'hadir' | 'tidak'>
  uji: Attempt[]
  sertifikat?: string
}
export type Certificate = { no: string; programKode: string; nik: string; nilai: number; tanggal: string }
export type Proposal = { id: string; programKode: string; nik: string; by: string; at: string; status: 'menunggu' | 'disetujui' | 'diabaikan' }

export const PROGRAMS: Program[] = []
export const ENROLLMENTS: Enrollment[] = []
export const CERTS: Certificate[] = []
export const PROPOSALS: Proposal[] = []

// ---------- store ----------
let version = 0
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
export const useTraining = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)

const stamp = () => { const { hh, mm } = nowTimeWIB(); return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB` }
export const programOf = (kode: string) => PROGRAMS.find((p) => p.kode === kode)
export const enrollmentsOf = (kode: string) => ENROLLMENTS.filter((e) => e.programKode === kode)
export const enrollmentOf = (kode: string, nik: string) => ENROLLMENTS.find((e) => e.programKode === kode && e.nik === nik)
export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)
export const certOf = (no: string) => CERTS.find((c) => c.no === no)
export const nextProgramKode = () => `TRN-2026-${String(Math.max(0, ...PROGRAMS.map((p) => Number(p.kode.slice(-3)))) + 1).padStart(3, '0')}`
export const passingOf = (p: Program) => p.passing ?? paketOf(p.paketId ?? '')?.passing ?? 0

// ---------- materi & progres ----------
/** Materi yang harus Tervalidasi sebelum uji. Sesi tatap muka dicakup oleh kehadiran. */
export const requiredMaterials = (p: Program) => p.materi.filter((m) => m.wajib && m.kind !== 'Sesi tatap muka')
/** Jumlah materi (termasuk sesi) dan yang wajib, untuk kolom Materi di tabel Program. */
export const materiCount = (p: Program) => ({ total: p.materi.length + p.sesi.length, wajib: p.materi.filter((m) => m.wajib).length + p.sesi.length })

export type UjiStatus = 'tanpa' | 'terkunci' | 'terbuka' | 'lulus' | 'tidak-lulus'
export type Progress = {
  wajib: number
  tervalidasi: number
  menunggu: number
  hadir: number
  sesiWajib: number
  uji: UjiStatus
  nilai?: number
  lockReason?: string
  selesai: boolean
}
export function progressOf(p: Program, e: Enrollment): Progress {
  const req = requiredMaterials(p)
  const tervalidasi = req.filter((m) => e.materi[m.id]?.status === 'tervalidasi').length
  const menunggu = req.filter((m) => e.materi[m.id]?.status === 'selesai').length
  const sesiWajib = p.tipe === 'Offline' ? p.sesi.length : 0
  const hadir = p.sesi.filter((s) => e.hadir[s.id] === 'hadir').length
  const reasons: string[] = []
  const left = req.filter((m) => e.materi[m.id]?.status !== 'tervalidasi')
  if (left.length) reasons.push(`Selesaikan ${left.length} materi wajib: ${left.map((m) => `${m.judul} (${e.materi[m.id]?.status === 'selesai' ? 'menunggu validasi' : 'belum dikerjakan'})`).join(', ')}`)
  if (sesiWajib && hadir < sesiWajib) reasons.push(`Kehadiran ${hadir}/${sesiWajib} sesi wajib`)
  const lulus = e.uji.find((a) => a.lulus)
  const last = e.uji[e.uji.length - 1]
  let uji: UjiStatus = 'tanpa'
  if (p.paketId) uji = lulus ? 'lulus' : last ? 'tidak-lulus' : reasons.length ? 'terkunci' : 'terbuka'
  if (uji === 'tidak-lulus' && reasons.length) uji = 'terkunci'
  const nilai = lulus?.nilai ?? last?.nilai
  const materialsDone = !left.length && (!sesiWajib || hadir >= sesiWajib)
  const selesai = p.paketId ? uji === 'lulus' : materialsDone
  return { wajib: req.length, tervalidasi, menunggu, hadir, sesiWajib, uji, nilai, lockReason: reasons.length ? reasons.join('; ') : undefined, selesai }
}
export type EnrStatus = 'Belum mulai' | 'Berjalan' | 'Lulus' | 'Tidak lulus' | 'Selesai'
export function enrStatus(p: Program, e: Enrollment): EnrStatus {
  const pr = progressOf(p, e)
  if (p.paketId && pr.uji === 'lulus') return 'Lulus'
  if (!p.paketId && pr.selesai) return 'Selesai'
  if (pr.uji === 'tidak-lulus') return 'Tidak lulus'
  const started = pr.tervalidasi + pr.menunggu + pr.hadir > 0 || e.uji.length > 0
  return started ? 'Berjalan' : 'Belum mulai'
}

// ---------- statistik ----------
export function trainingStats(user: CurrentUser, year = 2026) {
  const scoped = (e: Enrollment) => user.role !== 'supervisor' || empOf(e.nik)?.atasanId === user.nik
  const aktif = PROGRAMS.filter((p) => p.status === 'Aktif' && p.tahun === year)
  const berjalan = ENROLLMENTS.filter((e) => scoped(e) && aktif.some((p) => p.kode === e.programKode) && ['Belum mulai', 'Berjalan'].includes(enrStatus(programOf(e.programKode)!, e))).length
  const bulan = DEMO_TODAY.slice(0, 7)
  const sesi = PROGRAMS.filter((p) => p.status !== 'Draft').flatMap((p) => p.sesi).filter((s) => s.tanggal.startsWith(bulan)).length
  const taken = ENROLLMENTS.filter((e) => e.uji.some((a) => a.tanggal.startsWith(String(year))))
  const lulus = taken.filter((e) => e.uji.some((a) => a.lulus)).length
  return { aktif: aktif.length, berjalan, sesi, lulus, taken: taken.length, rate: taken.length ? (lulus / taken.length) * 100 : null }
}

// ---------- aksi ----------
export function saveProgram(next: Program, peserta: string[]) {
  const i = PROGRAMS.findIndex((p) => p.kode === next.kode)
  if (i >= 0) PROGRAMS[i] = next
  else PROGRAMS.push(next)
  for (const nik of peserta) if (!enrollmentOf(next.kode, nik)) ENROLLMENTS.push(blank(next.kode, nik))
  bump()
}
const blank = (programKode: string, nik: string): Enrollment => ({ programKode, nik, materi: {}, hadir: {}, uji: [] })
export function addParticipants(programKode: string, niks: string[]) {
  let n = 0
  for (const nik of niks) if (!enrollmentOf(programKode, nik)) { ENROLLMENTS.push(blank(programKode, nik)); n++ }
  if (n) bump()
  return n
}
export function setProgramStatus(kode: string, status: ProgramStatus) {
  const p = programOf(kode)
  if (p) { p.status = status; bump() }
}
export function markDone(kode: string, nik: string, materialId: string) {
  const e = enrollmentOf(kode, nik)
  if (!e || e.materi[materialId]) return
  e.materi[materialId] = { status: 'selesai', selesai: DEMO_TODAY }
  bump()
}
export function validateMaterial(kode: string, nik: string, materialId: string, actor: CurrentUser) {
  const e = enrollmentOf(kode, nik)
  const m = e?.materi[materialId]
  if (!e || !m || m.status !== 'selesai') return
  m.status = 'tervalidasi'
  m.validasi = { by: actor.nama, at: formatDate(DEMO_TODAY) }
  bump()
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
let certSeq = 0
const certNo = (tanggal: string) => `SRT/TRN-PPI/${String(++certSeq).padStart(3, '0')}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tanggal.slice(0, 4)}`

/** Input nilai uji manual (simulasi). Lulus bila nilai ≥ passing grade; sertifikat terbit otomatis. */
export function inputUji(kode: string, nik: string, nilai: number): { error?: string; certNo?: string; lulus?: boolean } {
  const p = programOf(kode)
  const e = enrollmentOf(kode, nik)
  if (!p || !e || !p.paketId) return { error: 'Program ini tidak punya uji akhir' }
  const pr = progressOf(p, e)
  if (pr.uji === 'terkunci') return { error: pr.lockReason }
  if (pr.uji === 'lulus') return { error: 'Peserta sudah lulus uji' }
  if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) return { error: 'Nilai harus 0–100' }
  const lulus = nilai >= passingOf(p)
  e.uji.push({ nilai, lulus, tanggal: DEMO_TODAY, sumber: 'simulasi' })
  if (lulus && !e.sertifikat) {
    const no = certNo(DEMO_TODAY)
    CERTS.push({ no, programKode: kode, nik, nilai, tanggal: DEMO_TODAY })
    e.sertifikat = no
  }
  bump()
  return { lulus, certNo: e.sertifikat }
}

/** Catat kehadiran sesi offline; hanya pada atau setelah tanggal sesi. */
export function recordAttendance(kode: string, sesiId: string, marks: Record<string, 'hadir' | 'tidak'>): { error?: string } {
  const p = programOf(kode)
  const s = p?.sesi.find((x) => x.id === sesiId)
  if (!p || !s) return { error: 'Sesi tidak ditemukan' }
  if (s.tanggal > DEMO_TODAY) return { error: 'Sesi belum berlangsung' }
  for (const [nik, v] of Object.entries(marks)) {
    const e = enrollmentOf(kode, nik)
    if (e) e.hadir[sesiId] = v
  }
  bump()
  return {}
}
export const sessionRecorded = (kode: string, sesiId: string) => enrollmentsOf(kode).some((e) => e.hadir[sesiId] != null)

// ---------- usulan peserta ----------
export function proposeParticipants(programKode: string, niks: string[], actor: CurrentUser) {
  const p = programOf(programKode)
  if (!p) return 0
  let n = 0
  for (const nik of niks) {
    if (enrollmentOf(programKode, nik) || PROPOSALS.some((x) => x.programKode === programKode && x.nik === nik && x.status === 'menunggu')) continue
    PROPOSALS.push({ id: `USL-${PROPOSALS.length + 1}`, programKode, nik, by: actor.nama, at: stamp(), status: 'menunggu' })
    n++
  }
  if (n) {
    notify({ to: 'hr_development', title: 'Usulan peserta training', body: `${actor.nama} mengusulkan ${n} pegawai untuk ${p.judul}.`, page: 'dev-training' })
    bump()
  }
  return n
}
export function decideProposal(id: string, approve: boolean) {
  const x = PROPOSALS.find((p) => p.id === id)
  if (!x || x.status !== 'menunggu') return
  x.status = approve ? 'disetujui' : 'diabaikan'
  if (approve) addParticipants(x.programKode, [x.nik])
  bump()
}

// ---------- integrasi kompetensi ----------
/** Penilaian terbaru (periode terakhir yang punya penilaian Diajukan atau Final): pegawai dengan gap ≥ 1 pada kompetensi tertentu. */
export function employeesWithGap(kodes: string[]): { nik: string; nama: string; kode: string; gap: number }[] {
  const period = PERIODS.find((p) => ASSESSMENTS.some((a) => a.periodId === p.id && (a.status === 'diajukan' || a.status === 'final')))
  if (!period) return []
  const out: { nik: string; nama: string; kode: string; gap: number }[] = []
  for (const a of ASSESSMENTS) {
    if (a.periodId !== period.id || (a.status !== 'diajukan' && a.status !== 'final')) continue
    const sc = scoreOf(standardFor(a.posisi, a.periodId, a), a.levels)
    for (const it of sc.items) if (kodes.includes(it.kode) && it.gap != null && it.gap >= 1) out.push({ nik: a.nik, nama: empOf(a.nik)?.nama ?? a.nik, kode: it.kode, gap: it.gap })
  }
  return out
}
/** Sertifikat lulus untuk kompetensi tertentu sejak tanggal tertentu (bukti penilaian; tidak mengubah level). */
export function certsFor(nik: string, kompetensi: string, since: string, until: string) {
  return CERTS.filter((c) => c.nik === nik && c.tanggal >= since && c.tanggal <= until && programOf(c.programKode)?.kompetensi.some((k) => k.kode === kompetensi))
}
export const competencyName = (kode: string) => competencyOf(kode)?.nama ?? kode

export type TrainingHistory = { program: Program; enr: Enrollment; status: EnrStatus }
export const historyOf = (nik: string): TrainingHistory[] =>
  ENROLLMENTS.filter((e) => e.nik === nik).flatMap((e) => { const p = programOf(e.programKode); return p ? [{ program: p, enr: e, status: enrStatus(p, e) }] : [] })

// ---------- seed ----------
const pad = (n: number) => String(n).padStart(2, '0')
const byName = (nama: string) => ROSTER.find((e) => e.nama === nama && e.posisi === 'Operator Injection')!.nik
const yt = (id: string, judul: string): Material => ({ id, kind: 'Video YouTube', judul, url: `https://www.youtube.com/watch?v=${id}`, wajib: true })

function seed() {
  const oi = ROSTER.filter((e) => e.posisi === 'Operator Injection')

  // TRN-2026-003: selesai Agustus 2026; 18 peserta, 16 lulus.
  const s3: Session[] = [
    { id: 'TRN-2026-003-S1', tanggal: '2026-08-12', mulai: '08.00', selesai: '12.00', lokasi: 'Ruang Training Produksi', trainer: 'Ratih Kusuma' },
    { id: 'TRN-2026-003-S2', tanggal: '2026-08-19', mulai: '08.00', selesai: '12.00', lokasi: 'Ruang Training Produksi', trainer: 'Ratih Kusuma' },
  ]
  PROGRAMS.push({
    kode: 'TRN-2026-003', judul: '5S Area Produksi', singkat: '5S Area Produksi', tipe: 'Offline', kompetensi: [{ kode: 'BSC-02', target: 3 }],
    penyelenggara: { jenis: 'Internal', nama: 'Ratih Kusuma' }, durasiJam: 8, materi: [], sesi: s3, kuota: 20, paketId: 'PKT-002', passing: 60, status: 'Selesai', tahun: 2026,
  })
  oi.slice(0, 18).forEach((e, i) => {
    const enr = blank('TRN-2026-003', e.nik)
    for (const s of s3) enr.hadir[s.id] = 'hadir'
    const gagal = i === 7 || i === 13
    const nilai = gagal ? (i === 7 ? 52 : 55) : 62 + ((i * 7) % 34)
    enr.uji.push({ nilai, lulus: !gagal, tanggal: '2026-08-26', sumber: 'aplikasi' })
    if (!gagal) {
      const no = certNo('2026-08-26')
      CERTS.push({ no, programKode: 'TRN-2026-003', nik: e.nik, nilai, tanggal: '2026-08-26' })
      enr.sertifikat = no
    }
    ENROLLMENTS.push(enr)
  })

  // TRN-2026-006: seri video YouTube, tanpa uji; peserta = pegawai bergap JOB-INJ-02 di S2.
  const vids = [yt('qcv-01', 'Kontrol Kualitas Visual 1: Jenis Cacat Visual'), yt('qcv-02', 'Kontrol Kualitas Visual 2: Standar Penerimaan'), yt('qcv-03', 'Kontrol Kualitas Visual 3: Teknik Pemeriksaan'), yt('qcv-04', 'Kontrol Kualitas Visual 4: Studi Kasus')]
  PROGRAMS.push({
    kode: 'TRN-2026-006', judul: 'Kontrol Kualitas Visual (seri video)', singkat: 'Kontrol Kualitas Visual', tipe: 'YouTube', kompetensi: [{ kode: 'JOB-INJ-02', target: 3 }],
    penyelenggara: { jenis: 'Internal', nama: 'Tim Produksi' }, durasiJam: 2, materi: vids, sesi: [], status: 'Aktif', tahun: 2026,
  })
  const gap6 = [...new Set(employeesWithGap(['JOB-INJ-02']).map((g) => g.nik))].slice(0, 5)
  const prog6 = [4, 3, 2, 1, 0]
  gap6.forEach((nik, i) => {
    const enr = blank('TRN-2026-006', nik)
    vids.slice(0, prog6[i]).forEach((m, j) => {
      enr.materi[m.id] = { status: 'tervalidasi', selesai: `2026-10-${pad(5 + j)}`, validasi: { by: 'Teddy Syahputra', at: `${6 + j} Okt 2026` } }
    })
    if (i === 2) enr.materi[vids[2].id] = { status: 'selesai', selesai: '2026-10-22' }
    ENROLLMENTS.push(enr)
  })

  // TRN-2026-009: K3 Dasar online.
  const m9: Material[] = [
    yt('k3-video', 'Pengenalan K3 Pabrik'),
    { id: 'k3-apd', kind: 'Dokumen PDF', judul: 'SOP APD', file: { name: 'SOP-APD-Rev3.pdf', size: 612_000 }, wajib: true },
    { id: 'k3-darurat', kind: 'Dokumen PDF', judul: 'Tanggap Darurat', file: { name: 'Tanggap-Darurat-Rev2.pdf', size: 845_000 }, wajib: true },
  ]
  PROGRAMS.push({
    kode: 'TRN-2026-009', judul: 'K3 Dasar Area Produksi', singkat: 'K3 Dasar', tipe: 'Online', kompetensi: [{ kode: 'BSC-01', target: 3 }],
    penyelenggara: { jenis: 'Internal', nama: 'Tim K3 (HR & GA)' }, durasiJam: 3, materi: m9, sesi: [], paketId: 'PKT-006', passing: 70, status: 'Aktif', tahun: 2026,
  })
  const ok = (id: string, d: string): [string, MaterialProgress] => [id, { status: 'tervalidasi', selesai: d, validasi: { by: 'Teddy Syahputra', at: formatDate(d) } }]
  const wahyu = blank('TRN-2026-009', byName('Wahyu Hidayat'))
  wahyu.materi = Object.fromEntries([ok('k3-video', '2026-10-19'), ok('k3-apd', '2026-10-20'), ok('k3-darurat', '2026-10-21')])
  const eko = blank('TRN-2026-009', byName('Eko Prasetyo'))
  eko.materi = Object.fromEntries([ok('k3-video', '2026-10-20'), ok('k3-darurat', '2026-10-22')])
  eko.materi['k3-apd'] = { status: 'selesai', selesai: '2026-10-23' }
  // Peserta dari luar tim Hendra (QC Inspector, Department QA) supaya pemfilteran tim dapat diuji; progres 1/3 materi.
  const siti = blank('TRN-2026-009', 'PPI-2024-0127')
  siti.materi = Object.fromEntries([ok('k3-video', '2026-10-21')])
  ENROLLMENTS.push(blank('TRN-2026-009', byName('Budi Wijaya')), eko, blank('TRN-2026-009', byName('Lukman Hakim')), wahyu, siti)

  // TRN-2026-011: Setting Mesin Injection Lanjutan (offline); sesi 1 belum dicatat kehadirannya.
  PROGRAMS.push({
    kode: 'TRN-2026-011', judul: 'Setting Mesin Injection Lanjutan', singkat: 'Setting Mesin Injection Lanjutan', tipe: 'Offline', kompetensi: [{ kode: 'JOB-INJ-01', target: 3 }],
    penyelenggara: { jenis: 'Internal', nama: 'Agus Setiadi' }, durasiJam: 8, materi: [], kuota: 12, paketId: 'PKT-002', passing: 60, status: 'Aktif', tahun: 2026,
    sesi: [
      { id: 'TRN-2026-011-S1', tanggal: '2026-10-23', mulai: '08.00', selesai: '12.00', lokasi: 'Ruang Training Produksi', trainer: 'Agus Setiadi' },
      { id: 'TRN-2026-011-S2', tanggal: '2026-11-06', mulai: '08.00', selesai: '12.00', lokasi: 'Ruang Training Produksi', trainer: 'Agus Setiadi' },
    ],
  })
  for (const n of ['Budi Wijaya', 'Hadi Budiman', 'Lukman Hakim', 'Muhamad Maulana']) ENROLLMENTS.push(blank('TRN-2026-011', byName(n)))
}
seed()

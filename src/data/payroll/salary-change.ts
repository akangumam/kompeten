import { nowStamp } from '@/data/attendance'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { periodContaining, periodForId, type AttPeriod } from '@/data/master/attendance-rules'
import { addPayAudit } from '@/data/payroll/audit'
import { gradeError, idr, saveSalary, salaryAt } from '@/data/payroll/salaries'
import { PAY_PERIODS, periodFinalized, type PeriodId } from '@/data/payroll/runs'
import { bump } from '@/data/payroll/store'

/** Perubahan Gaji Pokok: diajukan Payroll Officer, disetujui HR & GA Manager, lalu masuk riwayat Komponen Gaji. */
export type ChangeStatus = 'menunggu' | 'disetujui' | 'ditolak'
export type ChangeItem = { nik: string; lama: number; baru: number; berlaku: string; alasan?: string }
export type SalaryChange = {
  id: string
  items: ChangeItem[]
  kategori: string
  catatan: string
  sumber: 'Satuan' | 'Upload'
  status: ChangeStatus
  diajukan: { by: string; at: string }
  keputusan?: { by: string; at: string; alasan?: string }
}

export const KATEGORI = ['Penyesuaian UMK', 'Kenaikan berkala', 'Promosi', 'Koreksi', 'Lainnya'] as const

/** Awal periode Desember 2026 (24 Nov): Gaji Pokok berubah mulai periode itu. */
export const CHANGES: SalaryChange[] = [
  {
    id: 'PG-2026-0011',
    items: [{ nik: 'PPI-2024-0112', lama: 5_200_000, baru: 5_400_000, berlaku: periodForId('2026-12').start }],
    kategori: 'Kenaikan berkala',
    catatan: 'Kenaikan berkala tahunan sesuai evaluasi kinerja.',
    sumber: 'Satuan',
    status: 'menunggu',
    diajukan: { by: 'Mira Andriani', at: '26 Okt 2026, 09.15 WIB' },
  },
]
const SIGNATURES = new Map<string, string>()
let seq = 12
const nextId = () => `PG-2026-${String(seq++).padStart(4, '0')}`

export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)
export const pct = (lama: number, baru: number) => (lama > 0 ? ((baru - lama) / lama) * 100 : 0)
export const pctText = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

/* ---------- tanggal berlaku ---------- */
/** Periode (id bulan akhir) → status payroll Final; periode di luar daftar run dianggap belum Final. */
const isFinalPeriod = (p: AttPeriod) => (PAY_PERIODS.some((x) => x.id === p.id) ? periodFinalized(p.id as PeriodId) : false)
/** Berlaku mulai harus hari pertama sebuah periode payroll yang belum Final. */
export function effectiveOptions(): { value: string; label: string }[] {
  return ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']
    .map(periodForId)
    .filter((p) => !isFinalPeriod(p))
    .map((p) => ({ value: p.start, label: `${p.label} · mulai ${p.start.slice(8)} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(p.start.slice(5, 7)) - 1]} ${p.start.slice(0, 4)}` }))
}
export const berlakuFinal = (date: string) => isFinalPeriod(periodContaining(date))
export const berlakuIsPeriodStart = (date: string) => periodContaining(date).start === date

/* ---------- validasi ---------- */
export function gajiBaruError(emp: RosterEmployee, baru: number, lama: number): string {
  if (!Number.isFinite(baru) || baru <= 0) return 'Gaji baru wajib diisi'
  if (baru === lama) return 'Gaji baru sama dengan gaji lama'
  return gradeError(emp.grade, baru)
}

/* ---------- pengajuan ---------- */
const hasOpenFor = (nik: string, berlaku: string) => CHANGES.some((c) => c.status === 'menunggu' && c.items.some((i) => i.nik === nik && i.berlaku === berlaku))
export function submitSingle(input: { nik: string; baru: number; berlaku: string; kategori: string; catatan: string }, by: string): { id?: string; error?: string } {
  const emp = empOf(input.nik)
  if (!emp) return { error: 'Pegawai tidak ditemukan' }
  const lama = salaryAt(emp, input.berlaku).gajiPokok
  const err = gajiBaruError(emp, input.baru, lama)
  if (err) return { error: err }
  if (hasOpenFor(input.nik, input.berlaku)) return { error: 'Sudah ada pengajuan yang menunggu untuk pegawai dan tanggal ini' }
  const id = nextId()
  CHANGES.unshift({ id, items: [{ nik: input.nik, lama, baru: input.baru, berlaku: input.berlaku }], kategori: input.kategori, catatan: input.catatan.trim(), sumber: 'Satuan', status: 'menunggu', diajukan: { by, at: nowStamp() } })
  bump()
  return { id }
}

export function decide(id: string, approve: boolean, by: string, alasan = '') {
  const c = CHANGES.find((x) => x.id === id)
  if (!c || c.status !== 'menunggu') return
  c.status = approve ? 'disetujui' : 'ditolak'
  c.keputusan = { by, at: nowStamp(), alasan: approve ? undefined : alasan }
  if (approve) {
    for (const it of c.items) {
      const emp = empOf(it.nik)
      if (!emp) continue
      const cur = salaryAt(emp, it.berlaku)
      saveSalary(emp, { ...cur, gajiPokok: it.baru }, it.berlaku, `${c.id}: ${c.kategori}${it.alasan ? ` · ${it.alasan}` : ''}`, by)
    }
    addPayAudit({ by, group: 'Gaji Pegawai', entitas: c.id, perubahan: `Perubahan Gaji ${c.id} disetujui (${c.items.length} pegawai)`, berlaku: c.items[0].berlaku, alasan: c.kategori })
  }
  bump()
}

/**
 * Perubahan Gaji yang lahir dari Transaksi Kepegawaian (Promosi, Pindah Kategori): sudah Disetujui bersama persetujuan akhir
 * HR & GA Manager, tanpa persetujuan kedua, langsung masuk riwayat Komponen Gaji.
 */
export function recordApprovedChange(item: ChangeItem, kategori: string, catatan: string, diajukan: { by: string; at: string }, keputusan: { by: string; at: string }): string {
  const id = nextId()
  CHANGES.unshift({ id, items: [item], kategori, catatan, sumber: 'Satuan', status: 'disetujui', diajukan, keputusan })
  const emp = empOf(item.nik)
  if (emp) {
    const cur = salaryAt(emp, item.berlaku)
    saveSalary(emp, { ...cur, gajiPokok: item.baru }, item.berlaku, `${id}: ${kategori}`, keputusan.by)
    addPayAudit({ by: keputusan.by, group: 'Gaji Pegawai', entitas: id, perubahan: `Perubahan Gaji ${id} disetujui (1 pegawai)`, berlaku: item.berlaku, alasan: kategori })
  }
  bump()
  return id
}

/* ---------- unggah kenaikan serentak ---------- */
export const TEMPLATE_NAME = 'template-kenaikan-gaji.csv'
export const TEMPLATE_CSV = 'NIP,Gaji Baru,Berlaku Mulai,Alasan\r\nPPI-2024-0112,5400000,2026-11-24,Kenaikan berkala\r\n'

export type CsvRow = { line: number; nik: string; nama?: string; lama?: number; baru: number; berlaku: string; alasan: string; error?: string }

/** Tanggal ISO (2026-11-24) atau 24/11/2026 atau 24-11-2026; kosong bila tidak valid. */
function parseDate(raw: string): string {
  const t = raw.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (m) return t
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}
const splitCsv = (line: string) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))

export function parseUpload(text: string): { rows: CsvRow[]; headerError?: string } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { rows: [], headerError: 'File kosong' }
  const head = splitCsv(lines[0]).map((h) => h.toLowerCase())
  const want = ['nip', 'gaji baru', 'berlaku mulai', 'alasan']
  if (want.some((w, i) => head[i] !== w)) return { rows: [], headerError: 'Kolom harus NIP, Gaji Baru, Berlaku Mulai, Alasan' }
  const seen = new Set<string>()
  const rows = lines.slice(1).map((l, i): CsvRow => {
    const [nik, gaji, tgl, alasan] = splitCsv(l)
    const berlaku = parseDate(tgl ?? '')
    const baru = Number((gaji ?? '').replace(/[^\d]/g, ''))
    const emp = empOf(nik ?? '')
    const row: CsvRow = { line: i + 2, nik: nik ?? '', nama: emp?.nama, baru, berlaku, alasan: alasan ?? '' }
    if (!emp) return { ...row, error: 'NIP tidak ditemukan' }
    row.lama = berlaku ? salaryAt(emp, berlaku).gajiPokok : emp.gajiPokok
    if (seen.has(emp.nik)) return { ...row, error: 'Duplikat NIP' }
    seen.add(emp.nik)
    if (!berlaku) return { ...row, error: 'Format tanggal tidak valid' }
    if (berlakuFinal(berlaku)) return { ...row, error: 'Berlaku mulai di periode sudah Final' }
    if (!baru) return { ...row, error: 'Gaji baru tidak valid' }
    const g = gradeError(emp.grade, baru)
    if (g) return { ...row, error: 'Di luar rentang Grade' }
    return row
  })
  return { rows }
}

export function uploadSummary(valid: CsvRow[]) {
  const total = valid.reduce((a, r) => a + (r.baru - (r.lama ?? 0)), 0)
  const avg = valid.length ? valid.reduce((a, r) => a + pct(r.lama ?? 0, r.baru), 0) / valid.length : 0
  return `${valid.length.toLocaleString('id-ID')} pegawai · total kenaikan ${idr(total)}/bulan · rata-rata ${avg.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/** Satu batch dari baris valid. Isi yang sama persis dengan batch sebelumnya tidak dibuat lagi (idempoten). */
export function submitBatch(valid: CsvRow[], by: string): { id?: string; duplicate?: string; error?: string } {
  if (valid.length === 0) return { error: 'Tidak ada baris valid untuk diajukan' }
  const sig = valid.map((r) => `${r.nik}|${r.baru}|${r.berlaku}`).sort().join(';')
  const dup = SIGNATURES.get(sig)
  if (dup) return { duplicate: `Batch dengan isi sama sudah ada: ${dup}` }
  const id = nextId()
  SIGNATURES.set(sig, id)
  CHANGES.unshift({
    id,
    items: valid.map((r) => ({ nik: r.nik, lama: r.lama ?? 0, baru: r.baru, berlaku: r.berlaku, alasan: r.alasan || undefined })),
    kategori: 'Kenaikan serentak',
    catatan: `Unggah CSV ${valid.length} pegawai`,
    sumber: 'Upload',
    status: 'menunggu',
    diajukan: { by, at: nowStamp() },
  })
  bump()
  return { id }
}

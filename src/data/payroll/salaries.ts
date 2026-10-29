import { ROSTER, type RosterEmployee } from '@/data/employees'
import { GRADES } from '@/data/master/grades'
import { pembagiOf, type Kelompok } from '@/data/master/levels'
import { addPayAudit } from '@/data/payroll/audit'
import { makanAt, COMPONENTS, transportAt, tunjanganAt, upahHarianAt } from '@/data/payroll/components'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { bpjsOf, pphHarian, pphOf } from '@/data/payroll/calc'
import { terCategory, type TerCategory } from '@/data/payroll/statutory'
import { bump } from '@/data/payroll/store'
import { DEMO_TODAY } from '@/lib/today'

/** Data gaji per pegawai yang berlaku efektif per tanggal. */
export type SalaryRec = { gajiPokok: number; ptkp: string; bank: string; nomorRekening: string }

const BASE = new Map<string, SalaryRec>(
  ROSTER.map((e) => [e.nik, { gajiPokok: e.gajiPokok, ptkp: e.ptkp, bank: e.bank, nomorRekening: e.nomorRekening }]),
)
/** Perubahan setelah data awal (data awal berlaku sejak Tanggal Masuk). */
const EDITS: Record<string, Dated<SalaryRec>[]> = {}

export const historyOf = (e: RosterEmployee): Dated<SalaryRec>[] => [
  { berlakuMulai: e.tanggalMasuk, value: BASE.get(e.nik)!, oleh: 'Data awal', alasan: 'Data awal pegawai' },
  ...(EDITS[e.nik] ?? []),
]
export const salaryEntryAt = (e: RosterEmployee, date: string) => datedAt(historyOf(e), date)
export const salaryAt = (e: RosterEmployee, date: string = DEMO_TODAY): SalaryRec => salaryEntryAt(e, date).value
export const hasPending = (e: RosterEmployee, date: string = DEMO_TODAY) => (EDITS[e.nik] ?? []).some((x) => x.berlakuMulai > date)

export const gradeRange = (grade: string) => GRADES.find((g) => g.kode === grade)
export const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/** Pesan galat bila Gaji Pokok di luar rentang Grade pegawai; string kosong bila sesuai. */
export function gradeError(grade: string, gaji: number): string {
  const g = gradeRange(grade)
  return g && (gaji < g.min || gaji > g.max) ? `Di luar rentang Grade ${grade}: ${idr(g.min)} – ${idr(g.max)}` : ''
}

/** Menyamakan objek roster (dipakai modul Overtime, dll.) dengan nilai yang berlaku hari ini. */
export function syncRoster() {
  for (const e of ROSTER) {
    const s = salaryAt(e)
    e.gajiPokok = s.gajiPokok
    e.ptkp = s.ptkp
    e.bank = s.bank
    e.nomorRekening = s.nomorRekening
    e.tunjanganTetap = tunjanganAt(e.level, DEMO_TODAY)
  }
}

export function saveSalary(e: RosterEmployee, rec: SalaryRec, berlakuMulai: string, alasan: string, oleh: string) {
  const prev = salaryAt(e, berlakuMulai)
  datedPush((EDITS[e.nik] ??= []), { berlakuMulai, value: rec, oleh, alasan })
  const parts: string[] = []
  if (prev.gajiPokok !== rec.gajiPokok) parts.push(`Gaji Pokok ${idr(prev.gajiPokok)} → ${idr(rec.gajiPokok)}`)
  if (prev.ptkp !== rec.ptkp) parts.push(`PTKP ${prev.ptkp} → ${rec.ptkp}`)
  if (prev.bank !== rec.bank || prev.nomorRekening !== rec.nomorRekening) parts.push('Rekening bank diperbarui')
  addPayAudit({ by: oleh, group: 'Gaji Pegawai', entitas: `${e.nama} (${e.nik})`, perubahan: parts.join(' · ') || 'Tanpa perubahan nilai', berlaku: berlakuMulai, alasan })
  syncRoster()
  bump()
}

export const maskRekening = (bank: string, nomor: string) => (nomor ? `${bank} ••••${nomor.slice(-4)}` : 'Belum ada')
export const terLabel = (ptkp: string) => `${ptkp} · ${terCategory(ptkp)}`
export const upahBpjs = (e: RosterEmployee, date: string = DEMO_TODAY) => salaryAt(e, date).gajiPokok + tunjanganAt(e.level, date)

/* ---------- Simulasi bulan penuh ---------- */
export type Sim = {
  /** Pegawai Harian: upah = upah harian × hari hadir. */
  harian?: { upah: number }
  /** Outsourcing: dibayar ke vendor tanpa BPJS dan PPh 21. */
  vendor?: boolean
  hari: number
  gaji: number
  tunjangan: number
  makan: number
  transport: number
  pendapatan: number
  upah: number
  kesCo: number
  jkk: number
  jkkLabel: string
  jkm: number
  bebanBruto: number
  bruto: number
  kategori: TerCategory
  tarif: number
  beyond: boolean
  pph: number
  kesP: number
  jhtP: number
  jpP: number
  bpjsPegawai: number
  takeHome: number
}

const activeComp = (id: string) => COMPONENTS.find((c) => c.id === id)?.status !== 'Nonaktif'

/**
 * Simulasi satu bulan penuh: hari hadir 25 (Non Staff) / 21 (Staff); Harian 26 hari dengan upah harian; tanpa lembur dan potongan lain.
 * Parameter diambil pada tanggal acuan (default: tanggal bayar periode berjalan).
 * Take home = pendapatan − BPJS pegawai − PPh 21; bruto PPh 21 menambahkan beban perusahaan yang berstatus bruto (BPJS Kes, JKK, JKM).
 */
export function simulate(input: { gajiPokok: number; level: string; ptkp: string; kelompok: Kelompok }, date: string): Sim {
  const harian = input.kelompok === 'Harian'
  const vendor = input.kelompok === 'Outsourcing'
  const upahHarian = upahHarianAt(date)
  // Harian: 26 hari hadir × upah harian, tanpa tunjangan, uang makan, dan uang transport.
  const hari = harian ? 26 : pembagiOf(input.kelompok, input.level)
  const tunjangan = harian ? 0 : tunjanganAt(input.level, date)
  const gaji = harian ? upahHarian * hari : input.gajiPokok
  const makan = !harian && activeComp('makan') ? makanAt(date) * hari : 0
  const transport = !harian && activeComp('transport') ? transportAt(date) * hari : 0
  const pendapatan = gaji + tunjangan + makan + transport
  const upah = gaji + tunjangan

  const b = vendor
    ? { kesCo: 0, jkk: 0, jkm: 0, kesP: 0, jhtP: 0, jpP: 0, bpjsPegawai: 0, bebanBruto: 0, jkkLabel: '—' }
    : bpjsOf(upah, date)
  const bruto = pendapatan + b.bebanBruto
  const { kategori, tarif: rate, beyond, pph } = vendor
    ? { kategori: pphOf(0, input.ptkp).kategori, tarif: 0, beyond: false, pph: 0 }
    : harian
      ? pphHarian(bruto, upahHarian, input.ptkp, date)
      : pphOf(bruto, input.ptkp)
  const { kesCo, jkk, jkm, kesP, jhtP, jpP, bpjsPegawai } = b
  const bebanBruto = b.bebanBruto

  return {
    harian: harian ? { upah: upahHarian } : undefined,
    vendor,
    hari, gaji, tunjangan, makan, transport, pendapatan, upah, kesCo, jkk,
    jkkLabel: b.jkkLabel,
    jkm, bebanBruto, bruto, kategori, tarif: rate, beyond, pph, kesP, jhtP, jpP, bpjsPegawai,
    takeHome: pendapatan - bpjsPegawai - pph,
  }
}

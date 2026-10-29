import { ROSTER } from '@/data/employees'
import { billStateOf, extraBills } from '@/data/koperasi/loans'
import { isAnggota } from '@/data/koperasi/members'

/**
 * STUB tagihan potongan Koperasi per periode gaji (menunggu modul Koperasi; tidak mengubah saldo apa pun).
 * Deterministik per NIP. Semua anggota membayar Simpanan Wajib Rp 50.000; hanya pegawai bernama di bawah
 * yang punya tagihan lain pada periode Oktober 2026.
 */
export type KoperasiKind = 'kasbon' | 'angsuran' | 'simpananWajib' | 'simpananSukarela' | 'pinjamanNon'
export type KoperasiBill = { nik: string; kind: KoperasiKind; jumlah: number; /** Biaya admin kasbon 5%. */ admin?: number }
export type BillPeriod = string

export const KOPERASI_LABEL: Record<KoperasiKind, string> = {
  kasbon: 'Kasbon Koperasi',
  angsuran: 'Angsuran Pinjaman Koperasi',
  simpananWajib: 'Simpanan Wajib',
  simpananSukarela: 'Simpanan Sukarela',
  pinjamanNon: 'Pinjaman Non-Koperasi',
}

/** Keanggotaan berasal dari modul Koperasi (satu sumber data). */
export { isAnggota }

/**
 * Tagihan potongan per periode payroll. September memakai daftar lama yang dibekukan (payroll September sudah Closed).
 * Periode lain: Simpanan Wajib semua anggota + kasbon, angsuran, dan carry-over dari modul Koperasi. Setelah tagihan
 * periode dikirim/ditarik, daftarnya dibekukan dan tidak berubah oleh pengajuan baru (yang masuk ke periode berikutnya).
 */
const frozen = new Map<string, KoperasiBill[]>()
function wajibBills(): KoperasiBill[] {
  return ROSTER.filter((e) => isAnggota(e.nik)).map((e) => ({ nik: e.nik, kind: 'simpananWajib' as const, jumlah: 50_000 }))
}
export function billsFor(period: BillPeriod): KoperasiBill[] {
  const hit = frozen.get(period)
  if (hit) return hit
  let out: KoperasiBill[]
  if (period === '2026-09') {
    out = [...wajibBills(), { nik: 'PPI-2021-0019', kind: 'angsuran', jumlah: 450_000 }, { nik: 'PPI-2025-0265', kind: 'angsuran', jumlah: 300_000 }]
  } else {
    out = [...wajibBills(), ...extraBills(period)]
  }
  if (billStateOf(period).status !== 'draft') frozen.set(period, out)
  return out
}

export const billTotal = (b: KoperasiBill) => b.jumlah + (b.admin ?? 0)

/** Ringkasan untuk tab Komponen (periode Oktober 2026). */
export const koperasiSummary = (kind: KoperasiKind, period: BillPeriod = '2026-10') => {
  const list = billsFor(period).filter((b) => b.kind === kind)
  return { anggota: list.length, total: list.reduce((a, b) => a + billTotal(b), 0) }
}

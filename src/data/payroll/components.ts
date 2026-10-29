import { LEVEL_DEFS } from '@/data/master/levels'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'

export type CompJenis = 'Tetap' | 'Per hari hadir' | 'Dari modul' | 'Insidental'
export type CompGroup = 'pendapatan' | 'potongan' | 'beban'
/** Nilai yang bisa diedit langsung di tab Komponen. */
export type CompEditor = 'tunjangan' | 'makan' | 'transport' | 'upahHarian'

export type PayComponent = {
  id: string
  nama: string
  group: CompGroup
  jenis: CompJenis
  /** Teks dasar & nilai bila tidak diambil dari nilai berlaku (tarif statutori memakai statutory.ts). */
  dasar: string
  sumber: string
  brutoPph: boolean
  status: 'Aktif' | 'Nonaktif'
  editor?: CompEditor
  /** Riwayat status untuk komponen insidental/nonaktif. */
  riwayat: { berlakuMulai: string; perubahan: string; oleh: string }[]
}

const SEED_BY = 'Payroll Officer'

/** Tunjangan Jabatan per Level (sumber: Data Master Level). */
export const TUNJANGAN: Record<string, Dated<number>[]> = Object.fromEntries(
  LEVEL_DEFS.map((l) => [
    l.nama,
    [{ berlakuMulai: '2025-01-01', value: { Operator: 0, Leader: 750_000, Staff: 500_000, Supervisor: 1_500_000, Manager: 3_000_000 }[l.nama] ?? 0, oleh: SEED_BY }],
  ]),
)
export const MAKAN: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 25_000, oleh: SEED_BY }]
export const TRANSPORT: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 20_000, oleh: SEED_BY }]

/** Upah Harian (hanya Group Harian), effective-dated. */
export const UPAH_HARIAN: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 100_000, oleh: SEED_BY }]
export const upahHarianAt = (date: string) => datedAt(UPAH_HARIAN, date).value

export const tunjanganAt = (level: string, date: string) => (TUNJANGAN[level] ? datedAt(TUNJANGAN[level], date).value : 0)
export const makanAt = (date: string) => datedAt(MAKAN, date).value
export const transportAt = (date: string) => datedAt(TRANSPORT, date).value

export function editorHistory(editor: CompEditor, level?: string): Dated<number>[] {
  return editor === 'tunjangan' ? TUNJANGAN[level ?? ''] ?? [] : editor === 'makan' ? MAKAN : editor === 'upahHarian' ? UPAH_HARIAN : TRANSPORT
}
export function saveEditorValue(editor: CompEditor, level: string | undefined, entry: Dated<number>) {
  datedPush(editorHistory(editor, level), entry)
}

const c = (
  id: string,
  nama: string,
  group: CompGroup,
  jenis: CompJenis,
  dasar: string,
  sumber: string,
  brutoPph: boolean,
  editor?: CompEditor,
): PayComponent => ({ id, nama, group, jenis, dasar, sumber, brutoPph, status: 'Aktif', editor, riwayat: [] })

export const COMPONENTS: PayComponent[] = [
  c('gaji-pokok', 'Gaji Pokok', 'pendapatan', 'Tetap', 'Per pegawai, dalam rentang Grade', 'Gaji Pegawai', true),
  c('tunj-jabatan', 'Tunjangan Jabatan', 'pendapatan', 'Tetap', 'Per Level', 'Data Master Level', true, 'tunjangan'),
  c('makan', 'Uang Makan', 'pendapatan', 'Per hari hadir', '', 'Absensi', true, 'makan'),
  c('transport', 'Uang Transport', 'pendapatan', 'Per hari hadir', '', 'Absensi', true, 'transport'),
  c('upah-harian', 'Upah Harian', 'pendapatan', 'Per hari hadir', 'Per hari hadir, hanya Group Harian', 'Absensi', true, 'upahHarian'),
  c('lembur', 'Lembur', 'pendapatan', 'Dari modul', 'Jam-pengali × upah sejam (÷173)', 'Overtime (tervalidasi)', true),
  c('insidental', 'Bonus / Rapel / Lainnya', 'pendapatan', 'Insidental', 'Input per periode', 'Proses Payroll tahap 2', true),

  c('pot-hadir', 'Potongan Kehadiran (Alfa & Izin)', 'potongan', 'Dari modul', '(Gaji Pokok + Tunjangan Jabatan) ÷ 21 (Staff) / 25 (Non Staff, Outsourcing) × hari Alfa/Izin', 'Absensi, Cuti', false),
  c('bpjs-kes-p', 'BPJS Kesehatan (pegawai)', 'potongan', 'Tetap', '@kes-pegawai', 'BPJS & PPh 21', false),
  c('bpjs-jht-p', 'BPJS JHT (pegawai)', 'potongan', 'Tetap', '@jht-pegawai', 'BPJS & PPh 21', false),
  c('bpjs-jp-p', 'BPJS JP (pegawai)', 'potongan', 'Tetap', '@jp-pegawai', 'BPJS & PPh 21', false),
  c('pph21', 'PPh 21', 'potongan', 'Dari modul', 'TER bulanan × penghasilan bruto', 'BPJS & PPh 21', false),
  c('kasbon', 'Kasbon Koperasi', 'potongan', 'Dari modul', 'Sesuai tagihan periode', 'Koperasi', false),
  c('angsuran', 'Angsuran Pinjaman Koperasi', 'potongan', 'Dari modul', 'Sesuai tagihan periode', 'Koperasi', false),
  c('simp-wajib', 'Simpanan Wajib', 'potongan', 'Dari modul', 'Sesuai tagihan periode', 'Koperasi', false),
  c('simp-sukarela', 'Simpanan Sukarela', 'potongan', 'Dari modul', 'Sesuai tagihan periode', 'Koperasi', false),
  c('pinjaman-non', 'Pinjaman Non-Koperasi', 'potongan', 'Dari modul', 'Sesuai tagihan periode', 'Koperasi', false),

  c('co-kes', 'BPJS Kesehatan', 'beban', 'Tetap', '@kes-perusahaan', 'BPJS & PPh 21', true),
  c('co-jht', 'JHT', 'beban', 'Tetap', '@jht-perusahaan', 'BPJS & PPh 21', false),
  c('co-jp', 'JP', 'beban', 'Tetap', '@jp-perusahaan', 'BPJS & PPh 21', false),
  c('co-jkk', 'JKK', 'beban', 'Tetap', '@jkk', 'BPJS & PPh 21', true),
  c('co-jkm', 'JKM', 'beban', 'Tetap', '@jkm', 'BPJS & PPh 21', true),
]

/** Komponen insidental baru (mis. Bonus Produksi) dari Payroll Officer. */
export function addInsidental(input: { nama: string; group: 'pendapatan' | 'potongan'; brutoPph: boolean; berlakuMulai: string; oleh: string }) {
  const comp: PayComponent = {
    id: `ins-${COMPONENTS.length + 1}`,
    nama: input.nama.trim(),
    group: input.group,
    jenis: 'Insidental',
    dasar: 'Input per periode',
    sumber: 'Proses Payroll tahap 2',
    brutoPph: input.group === 'pendapatan' ? input.brutoPph : false,
    status: 'Aktif',
    riwayat: [{ berlakuMulai: input.berlakuMulai, perubahan: 'Komponen dibuat', oleh: input.oleh }],
  }
  const after = COMPONENTS.map((x, i) => [x, i] as const).filter(([x]) => x.group === input.group)
  COMPONENTS.splice(after[after.length - 1][1] + 1, 0, comp)
  return comp
}

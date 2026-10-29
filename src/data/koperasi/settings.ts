import { bump } from '@/data/koperasi/store'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/** Pengaturan Koperasi, effective-dated. Hanya Ketua yang mengubah; halaman Koperasi membaca nilai dari sini. */
export type KopKey =
  | 'pokok'
  | 'wajibMin'
  | 'wajibStep'
  | 'sukarelaStep'
  | 'pencairanMin'
  | 'kasbonPlafond'
  | 'kasbonMin'
  | 'kasbonStep'
  | 'kasbonAdminPct'
  | 'kasbonJendelaDari'
  | 'kasbonJendelaSampai'
  | 'pinjamanTenor'
  | 'pinjamanPlafondKali'
  | 'masaMin'
  | 'angsuranBulat'
  | 'batasPengeluaran'
  | 'shuPinjam'
  | 'shuWajib'
  | 'shuSukarela'
  | 'shuPengurus'

export type SettingDef = { key: KopKey; group: string; label: string; unit: 'rp' | 'persen' | 'tanggal' | 'bulan' | 'kali'; min: number; max?: number; helper?: string }
export const SETTING_DEFS: SettingDef[] = [
  { key: 'pokok', group: 'Simpanan', label: 'Simpanan Pokok', unit: 'rp', min: 0, helper: 'Dibayar sekali saat menjadi anggota' },
  { key: 'wajibMin', group: 'Simpanan', label: 'Simpanan Wajib minimum', unit: 'rp', min: 1 },
  { key: 'wajibStep', group: 'Simpanan', label: 'Kelipatan Simpanan Wajib', unit: 'rp', min: 1 },
  { key: 'sukarelaStep', group: 'Simpanan', label: 'Kelipatan Simpanan Sukarela', unit: 'rp', min: 1 },
  { key: 'pencairanMin', group: 'Pencairan', label: 'Pencairan Sukarela minimum', unit: 'rp', min: 1 },
  { key: 'kasbonPlafond', group: 'Kasbon', label: 'Plafond Kasbon per bulan', unit: 'rp', min: 1 },
  { key: 'kasbonMin', group: 'Kasbon', label: 'Nominal Kasbon minimum', unit: 'rp', min: 1 },
  { key: 'kasbonStep', group: 'Kasbon', label: 'Kelipatan nominal Kasbon', unit: 'rp', min: 1 },
  { key: 'kasbonAdminPct', group: 'Kasbon', label: 'Biaya admin Kasbon', unit: 'persen', min: 0, max: 100 },
  { key: 'kasbonJendelaDari', group: 'Kasbon', label: 'Jendela pengajuan Kasbon: dari tanggal', unit: 'tanggal', min: 1, max: 28 },
  { key: 'kasbonJendelaSampai', group: 'Kasbon', label: 'Jendela pengajuan Kasbon: sampai tanggal', unit: 'tanggal', min: 1, max: 31 },
  { key: 'pinjamanTenor', group: 'Pinjaman', label: 'Tenor Pinjaman maksimum', unit: 'bulan', min: 1, max: 120 },
  { key: 'pinjamanPlafondKali', group: 'Pinjaman', label: 'Plafond Pinjaman (× saldo Simpanan Wajib)', unit: 'kali', min: 1, max: 20 },
  { key: 'angsuranBulat', group: 'Pinjaman', label: 'Pembulatan angsuran ke atas', unit: 'rp', min: 1 },
  { key: 'batasPengeluaran', group: 'Pengeluaran', label: 'Batas pengeluaran tanpa persetujuan Ketua', unit: 'rp', min: 0, helper: 'Sampai batas ini langsung Tercatat; di atasnya Menunggu Ketua' },
  { key: 'shuPinjam', group: 'SHU', label: 'Jasa Anggota Meminjam (default)', unit: 'persen', min: 0, max: 100 },
  { key: 'shuWajib', group: 'SHU', label: 'Jasa Simpanan Wajib (default)', unit: 'persen', min: 0, max: 100 },
  { key: 'shuSukarela', group: 'SHU', label: 'Jasa Simpanan Sukarela (default)', unit: 'persen', min: 0, max: 100 },
  { key: 'shuPengurus', group: 'SHU', label: 'Pengurus (default)', unit: 'persen', min: 0, max: 100, helper: 'Ketua dapat menyesuaikan per tahun buku di halaman SHU' },
  { key: 'masaMin', group: 'Keanggotaan', label: 'Masa keanggotaan minimum untuk Pinjaman', unit: 'bulan', min: 0, max: 60 },
]

const seed = (value: number): Dated<number>[] => [{ berlakuMulai: '2020-01-01', value, oleh: 'Data awal', alasan: 'Nilai awal Koperasi' }]
export const SETTING_HISTORY: Record<KopKey, Dated<number>[]> = {
  pokok: seed(100_000),
  wajibMin: seed(50_000),
  wajibStep: seed(10_000),
  sukarelaStep: seed(10_000),
  pencairanMin: seed(100_000),
  kasbonPlafond: seed(1_000_000),
  kasbonMin: seed(100_000),
  kasbonStep: seed(50_000),
  kasbonAdminPct: seed(5),
  kasbonJendelaDari: seed(1),
  kasbonJendelaSampai: seed(23),
  pinjamanTenor: seed(12),
  angsuranBulat: seed(1_000),
  batasPengeluaran: seed(500_000),
  shuPinjam: seed(25),
  shuWajib: seed(40),
  shuSukarela: seed(20),
  shuPengurus: seed(15),
  pinjamanPlafondKali: seed(3),
  masaMin: seed(3),
}
export const settingAt = (key: KopKey, date: string = DEMO_TODAY) => datedAt(SETTING_HISTORY[key], date).value
export const settingEntry = (key: KopKey, date: string = DEMO_TODAY) => datedAt(SETTING_HISTORY[key], date)

/* Nilai berlaku hari ini sebagai live binding: halaman membaca POKOK, WAJIB_MIN, dll. dan ikut berubah setelah pengaturan disimpan. */
export let POKOK = settingAt('pokok')
export let WAJIB_MIN = settingAt('wajibMin')
export let STEP = settingAt('wajibStep')
export let SUKARELA_STEP = settingAt('sukarelaStep')
export let MIN_PENCAIRAN = settingAt('pencairanMin')
export let PLAFOND_KALI = settingAt('pinjamanPlafondKali')
export let MASA_MIN = settingAt('masaMin')
export let KASBON_ADMIN_PCT = settingAt('kasbonAdminPct')
function refresh() {
  POKOK = settingAt('pokok')
  WAJIB_MIN = settingAt('wajibMin')
  STEP = settingAt('wajibStep')
  SUKARELA_STEP = settingAt('sukarelaStep')
  MIN_PENCAIRAN = settingAt('pencairanMin')
  PLAFOND_KALI = settingAt('pinjamanPlafondKali')
  MASA_MIN = settingAt('masaMin')
  KASBON_ADMIN_PCT = settingAt('kasbonAdminPct')
}

export function saveSetting(key: KopKey, value: number, berlakuMulai: string, alasan: string, oleh: string) {
  datedPush(SETTING_HISTORY[key], { berlakuMulai, value, oleh, alasan })
  refresh()
  bump()
}

export function valueText(def: SettingDef, v: number) {
  switch (def.unit) {
    case 'rp': return `Rp ${v.toLocaleString('id-ID')}`
    case 'persen': return `${v.toLocaleString('id-ID')}%`
    case 'tanggal': return `Tanggal ${v}`
    case 'bulan': return `${v} bulan`
    case 'kali': return `${v}×`
  }
}

/* ---------- Pos Anggaran dan Kategori Unit Dagang (master) ---------- */
export type PosKategori = 'Operasional' | 'Kompensasi Pengurus'
export type Pos = { kode: string; nama: string; kategori: PosKategori; aktif: boolean }
export const POS_KATEGORI: PosKategori[] = ['Operasional', 'Kompensasi Pengurus']
export const POS_ANGGARAN: Pos[] = [
  { kode: 'OPS-001', nama: 'Administrasi & ATK', kategori: 'Operasional', aktif: true },
  { kode: 'OPS-002', nama: 'Biaya Bank & Transfer', kategori: 'Operasional', aktif: true },
  { kode: 'OPS-003', nama: 'Rapat Pengurus & RAT', kategori: 'Operasional', aktif: true },
  { kode: 'KPG-001', nama: 'Honor Pengurus', kategori: 'Kompensasi Pengurus', aktif: true },
]
export const posOf = (kode: string) => POS_ANGGARAN.find((p) => p.kode === kode)
export type UdKategori = { nama: string; aktif: boolean }
export const UD_KATEGORI: Record<'Masuk' | 'Keluar', UdKategori[]> = {
  Masuk: [{ nama: 'Penjualan tunai', aktif: true }, { nama: 'Lainnya', aktif: true }],
  Keluar: [{ nama: 'Pembelian barang dagang', aktif: true }, { nama: 'Biaya operasional unit', aktif: true }, { nama: 'Lainnya', aktif: true }],
}
export const MASTER_LOG: { at: string; oleh: string; aksi: string }[] = []
const log = (oleh: string, aksi: string) => MASTER_LOG.unshift({ at: DEMO_TODAY, oleh, aksi })
export function addPos(input: { kode: string; nama: string; kategori: PosKategori }, oleh: string): string {
  const kode = input.kode.trim().toUpperCase()
  if (!kode || !input.nama.trim()) return 'Kode dan nama wajib diisi'
  if (POS_ANGGARAN.some((p) => p.kode === kode)) return 'Kode sudah dipakai'
  POS_ANGGARAN.push({ kode, nama: input.nama.trim(), kategori: input.kategori, aktif: true })
  log(oleh, `Menambah pos ${kode} ${input.nama.trim()}`)
  bump()
  return ''
}
export function togglePos(kode: string, oleh: string) {
  const p = posOf(kode)
  if (!p) return
  p.aktif = !p.aktif
  log(oleh, `${p.aktif ? 'Mengaktifkan' : 'Menonaktifkan'} pos ${kode}`)
  bump()
}
export function addUdKategori(jenis: 'Masuk' | 'Keluar', nama: string, oleh: string): string {
  if (!nama.trim()) return 'Nama kategori wajib diisi'
  if (UD_KATEGORI[jenis].some((k) => k.nama.toLowerCase() === nama.trim().toLowerCase())) return 'Kategori sudah ada'
  UD_KATEGORI[jenis].push({ nama: nama.trim(), aktif: true })
  log(oleh, `Menambah kategori ${jenis}: ${nama.trim()}`)
  bump()
  return ''
}
export function toggleUdKategori(jenis: 'Masuk' | 'Keluar', nama: string, oleh: string) {
  const k = UD_KATEGORI[jenis].find((x) => x.nama === nama)
  if (!k) return
  k.aktif = !k.aktif
  log(oleh, `${k.aktif ? 'Mengaktifkan' : 'Menonaktifkan'} kategori ${jenis}: ${nama}`)
  bump()
}
/** Berlaku mulai default Pengaturan Koperasi: tanggal 1 bulan depan; hari ini boleh, tanggal lampau tidak. */
export const defaultBerlaku = () => {
  const [y, m] = DEMO_TODAY.split('-').map(Number)
  const t = y * 12 + m
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01`
}

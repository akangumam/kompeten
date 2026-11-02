import { nowStamp } from '@/data/attendance'
import { addMonths } from '@/data/koperasi/dates'
import { postLedger } from '@/data/koperasi/finance'
import { balanceOf } from '@/data/koperasi/ledger'
import { stageActor } from '@/data/koperasi/ksb'
import { activeMembers, memberOf, monthsAsMember } from '@/data/koperasi/members'
import { settingAt } from '@/data/koperasi/settings'
import { bump } from '@/data/koperasi/store'
import { notify } from '@/data/notifications'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Kasbon, Pinjaman Koperasi, dan Pinjaman Non-Koperasi.
 * Angka (plafon, biaya admin, jendela, tenor, pengali, masa anggota) dibaca dari Pengaturan Koperasi.
 * Saldo (kasbon, pinjaman) berubah hanya saat Bendahara mengonfirmasi realisasi potongan dari Payroll.
 */
export const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const bulanName = (id: string) => MONTHS_ID[Number(id.slice(5, 7)) - 1]
export const periodLabel = (id: string) => `${bulanName(id)} ${id.slice(0, 4)}`
export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export type Decision = { oleh: string; tanggal: string; alasan?: string }
/** Verifikasi Sekretaris atas pengajuan anggota dari aplikasi. */
export type Verif = { oleh: string; tanggal: string; catatan?: string }
type Cair = { oleh: string; tanggal: string; ref: string; bukti: string }

/* ============================ Periode tagihan payroll ============================ */
export type BillBatchStatus = 'draft' | 'terkirim' | 'ditarik'
export const BILL_PERIOD_IDS = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09']
export const BILL_STATE: Record<string, { status: BillBatchStatus; at?: string; by?: string }> = {
  '2026-09': { status: 'ditarik', at: '23 Sep 2026', by: 'Ratna Dewi' },
  '2026-10': { status: 'terkirim', at: '23 Okt 2026', by: 'Ratna Dewi' },
}
export const billStateOf = (id: string) => BILL_STATE[id] ?? { status: 'draft' as BillBatchStatus }
/** Periode payroll pertama yang tagihannya belum dikirim/ditarik. */
export const nextOpenPeriod = (after = '2026-09') => BILL_PERIOD_IDS.find((id) => id > after && billStateOf(id).status === 'draft') ?? BILL_PERIOD_IDS[BILL_PERIOD_IDS.length - 1]

/* ============================ Kasbon ============================ */
export type KasbonStatus = 'menunggu-sekretaris' | 'menunggu-ketua' | 'disetujui' | 'dicairkan' | 'ditagihkan' | 'lunas' | 'tertahan' | 'ditolak' | 'dibatalkan'
export const TUJUAN = ['Kebutuhan keluarga', 'Pendidikan', 'Kesehatan', 'Lainnya'] as const
export type Kasbon = {
  id: string
  nik: string
  /** Bulan kasbon (yyyy-mm). */
  bulan: string
  nominal: number
  admin: number
  penyelesaian: 'potong' | 'tunai'
  tujuan: string
  catatan: string
  diajukan: string
  diinputOleh: string
  status: KasbonStatus
  /** 'aplikasi' = diajukan anggota lewat aplikasi mobile (diverifikasi Sekretaris lebih dulu). */
  sumber?: 'web' | 'aplikasi'
  verif?: Verif
  keputusan?: Decision
  cair?: Cair
  /** Periode payroll tempat tagihan dipotong. */
  periodeTagih?: string
  tunai?: { oleh: string; tanggal: string; bukti: string }
  batal?: Decision
}
const adminOf = (nominal: number) => Math.round((nominal * settingAt('kasbonAdminPct')) / 100)
const kb = (id: string, nik: string, bulan: string, nominal: number, p: Partial<Kasbon>): Kasbon => ({
  id, nik, bulan, nominal, admin: adminOf(nominal), penyelesaian: 'potong', tujuan: 'Kebutuhan keluarga', catatan: '', diajukan: `${bulan}-02`, diinputOleh: 'Ratna Dewi', status: 'ditagihkan', ...p,
})
export const KASBON: Kasbon[] = [
  kb('KSB-2026-0102', 'PPI-2022-0045', '2026-10', 800_000, { diajukan: '2026-10-14', status: 'ditolak', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-10-15', alasan: 'Formulir belum ditandatangani anggota' } }),
  kb('KSB-2026-0101', 'PPI-2024-0112', '2026-10', 500_000, { diajukan: '2026-10-05', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-10-05' }, cair: { oleh: 'Nina Marlina', tanggal: '2026-10-06', ref: 'TRF-061026-001', bukti: 'bukti-ksb-0101.pdf' }, periodeTagih: '2026-10' }),
  kb('KSB-2026-0095', 'PPI-2024-0112', '2026-09', 300_000, { diajukan: '2026-09-04', status: 'lunas', penyelesaian: 'tunai', keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-09-04' }, cair: { oleh: 'Nina Marlina', tanggal: '2026-09-05', ref: 'TRF-050926-001', bukti: 'bukti-ksb-0095.pdf' }, tunai: { oleh: 'Nina Marlina', tanggal: '2026-09-28', bukti: 'bukti-tunai-ksb-0095.pdf' } }),
]
// Seed pengajuan dari aplikasi mobile: menunggu verifikasi Sekretaris. Jendela kasbon Okt = tgl 1–23, jadi tanggal pengajuan 22 Okt.
KASBON.unshift(kb('KSB-2026-0103', 'PPI-2022-0045', '2026-10', 500_000, { diajukan: '2026-10-22', diinputOleh: 'Wahyu Hidayat (aplikasi)', status: 'menunggu-sekretaris', sumber: 'aplikasi' }))
notify({ to: 'sekretaris', title: 'Kasbon dari aplikasi', body: 'Kasbon dari aplikasi — Wahyu Hidayat Rp 500.000', page: 'coop-cash-advance' })
let ksbSeq = 104

const RESERVING_KASBON: KasbonStatus[] = ['menunggu-sekretaris', 'menunggu-ketua', 'disetujui', 'dicairkan', 'ditagihkan', 'tertahan']
export const kasbonTotal = (k: Kasbon) => k.nominal + k.admin
export const kasbonUsed = (nik: string, bulan: string) => KASBON.filter((k) => k.nik === nik && k.bulan === bulan && RESERVING_KASBON.includes(k.status)).reduce((a, k) => a + k.nominal, 0)

/** Jendela pengajuan: tanggal dari–sampai (WIB) pada bulan berjalan. */
export function kasbonWindow(date: string = DEMO_TODAY) {
  const dari = settingAt('kasbonJendelaDari', date)
  const sampai = settingAt('kasbonJendelaSampai', date)
  const day = Number(date.slice(8, 10))
  const bulan = date.slice(0, 7)
  const next = addMonths(`${bulan}-01`, 1).slice(0, 7)
  return { dari, sampai, open: day >= dari && day <= sampai, bulan, bulanName: bulanName(bulan), nextBulan: bulanName(next), nextDari: dari }
}
export function kasbonBlock(date: string = DEMO_TODAY): string {
  const w = kasbonWindow(date)
  return w.open ? '' : `Jendela kasbon ${w.bulanName} ditutup. Dibuka lagi ${w.nextDari} ${w.nextBulan}.`
}
export function kasbonError(nik: string, nominal: number, bulan = DEMO_TODAY.slice(0, 7)): string {
  const min = settingAt('kasbonMin')
  const step = settingAt('kasbonStep')
  if (!nominal) return 'Nominal wajib diisi'
  if (nominal < min) return `Nominal minimal ${rp(min)}`
  if (nominal % step !== 0) return `Nominal harus kelipatan ${rp(step)}`
  const used = kasbonUsed(nik, bulan)
  const sisa = settingAt('kasbonPlafond') - used
  if (nominal > sisa) return `Sisa plafon kasbon ${bulanName(bulan)} ${rp(Math.max(0, sisa))} (sudah dipakai ${rp(used)}).`
  return ''
}
export function createKasbon(input: { nik: string; nominal: number; tujuan: string; catatan: string; penyelesaian: 'potong' | 'tunai' }, by: string): { id?: string; error?: string } {
  const block = kasbonBlock()
  if (block) return { error: block }
  const m = memberOf(input.nik)
  if (!m || m.status !== 'aktif') return { error: 'Hanya anggota aktif yang dapat mengajukan kasbon' }
  const err = kasbonError(input.nik, input.nominal)
  if (err) return { error: err }
  const id = `KSB-2026-${String(ksbSeq++).padStart(4, '0')}`
  KASBON.unshift({
    id, nik: input.nik, bulan: DEMO_TODAY.slice(0, 7), nominal: input.nominal, admin: adminOf(input.nominal), penyelesaian: input.penyelesaian,
    tujuan: input.tujuan, catatan: input.catatan.trim(), diajukan: DEMO_TODAY, diinputOleh: by, status: 'menunggu-ketua',
  })
  bump()
  return { id }
}
export function decideKasbon(id: string, approve: boolean, alasan: string, by: string) {
  const k = KASBON.find((x) => x.id === id)
  if (!k || k.status !== 'menunggu-ketua') return
  k.status = approve ? 'disetujui' : 'ditolak'
  k.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan: approve ? undefined : alasan }
  bump()
}
/** Pencairan (Bendahara): transfer ke rekening payroll; potong gaji → ditagihkan pada periode payroll berikutnya yang belum ditarik. */
export function cairkanKasbon(id: string, input: { tanggal: string; ref: string; bukti: string }, by: string) {
  const k = KASBON.find((x) => x.id === id)
  if (!k || k.status !== 'disetujui') return
  k.cair = { oleh: by, ...input }
  if (k.penyelesaian === 'potong') {
    k.periodeTagih = nextOpenPeriod()
    k.status = 'ditagihkan'
  } else k.status = 'dicairkan'
  bump()
}
export function terimaTunai(id: string, input: { tanggal: string; bukti: string }, by: string) {
  const k = KASBON.find((x) => x.id === id)
  if (!k || k.status !== 'dicairkan') return
  k.tunai = { oleh: by, ...input }
  k.status = 'lunas'
  postLedger({ tanggal: input.tanggal, tipe: 'admin', nominal: k.admin, ref: k.id, label: `Biaya admin ${k.id} (Lunas tunai)` })
  bump()
}
export function batalKasbon(id: string, alasan: string, by: string) {
  const k = KASBON.find((x) => x.id === id)
  if (!k || (k.status !== 'menunggu-sekretaris' && k.status !== 'menunggu-ketua' && k.status !== 'disetujui')) return
  k.status = 'dibatalkan'
  k.batal = { oleh: by, tanggal: DEMO_TODAY, alasan }
  bump()
}
export const kasbonReviewer = (k: Kasbon) => stageActor('ketua', k.nik)
export const kasbonDisburser = (k: Kasbon) => stageActor('bendahara', k.nik)
export const previewAdmin = adminOf

/* ============================ Pinjaman ============================ */
export type InstStatus = 'akan' | 'ditagihkan' | 'lunas' | 'tertahan'
export type Inst = { ke: number; periode: string; nominal: number; status: InstStatus; /** Periode payroll yang menagih (berpindah saat Tertahan). */ tagihPeriode: string; setoran?: { tanggal: string; bukti: string; oleh: string } }
export type LoanStatus = 'menunggu-sekretaris' | 'menunggu-ketua' | 'disetujui' | 'aktif' | 'lunas' | 'ditolak' | 'dibatalkan'
export type Pelunasan = { nominal: number; metode: 'Tunai' | 'Transfer'; bukti: string; oleh: string; tanggal: string; status: 'menunggu-bendahara' | 'dikonfirmasi'; konfirmasi?: { oleh: string; tanggal: string } }
export type Loan = {
  id: string
  jenis: 'koperasi' | 'non'
  nik: string
  pokok: number
  tenor: number
  tujuan: string
  diajukan: string
  diinputOleh: string
  status: LoanStatus
  sumber?: 'web' | 'aplikasi'
  verif?: Verif
  keputusan?: Decision
  cair?: Cair
  inst: Inst[]
  pelunasan?: Pelunasan
  batal?: Decision
  /** Non-Koperasi */
  pemberi?: string
  noPerjanjian?: string
  angsuran?: number
  mulai?: string
  lampiran?: string
}
const round = (n: number) => Math.ceil(n / settingAt('angsuranBulat')) * settingAt('angsuranBulat')
/** Angsuran = pokok ÷ tenor dibulatkan ke atas; angsuran terakhir menyesuaikan sehingga total sama dengan pokok. */
export function scheduleOf(pokok: number, tenor: number): number[] {
  if (!pokok || !tenor) return []
  const a = round(pokok / tenor)
  const list = Array.from({ length: tenor }, () => a)
  list[tenor - 1] = pokok - a * (tenor - 1)
  return list
}
const mkInst = (first: string, noms: number[], statuses: InstStatus[] = []): Inst[] =>
  noms.map((nominal, i) => {
    const periode = addMonths(`${first}-01`, i).slice(0, 7)
    return { ke: i + 1, periode, nominal, status: statuses[i] ?? 'akan', tagihPeriode: periode }
  })
const st = (lunas: number, then?: InstStatus): InstStatus[] => [...Array<InstStatus>(lunas).fill('lunas'), ...(then ? [then] : [])]
const loan = (p: Omit<Loan, 'diinputOleh' | 'tujuan'> & { tujuan?: string; diinputOleh?: string }): Loan => ({ diinputOleh: 'Ratna Dewi', tujuan: 'Kebutuhan keluarga', ...p })
export const LOANS: Loan[] = [
  loan({ id: 'PJK-2026-0071', jenis: 'koperasi', nik: 'PPI-2023-0088', pokok: 3_000_000, tenor: 6, diajukan: '2026-10-22', status: 'menunggu-ketua', inst: [], tujuan: 'Pendidikan' }),
  loan({
    id: 'PJK-2026-0058', jenis: 'koperasi', nik: 'PPI-2025-0265', pokok: 900_000, tenor: 3, diajukan: '2026-07-10', status: 'aktif',
    keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-07-13' }, cair: { oleh: 'Nina Marlina', tanggal: '2026-07-15', ref: 'TRF-150726-002', bukti: 'bukti-pjk-0058.pdf' },
    inst: mkInst('2026-08', [300_000, 300_000, 300_000], st(2, 'ditagihkan')),
  }),
  loan({
    id: 'PJK-2026-0031', jenis: 'koperasi', nik: 'PPI-2021-0019', pokok: 5_400_000, tenor: 12, diajukan: '2026-03-05', status: 'aktif',
    keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-03-08' }, cair: { oleh: 'Nina Marlina', tanggal: '2026-03-10', ref: 'TRF-100326-001', bukti: 'bukti-pjk-0031.pdf' },
    inst: mkInst('2026-04', Array(12).fill(450_000), st(6, 'ditagihkan')),
  }),
  loan({
    id: 'PNK-2026-0004', jenis: 'non', nik: 'PPI-2022-0045', pokok: 5_000_000, tenor: 10, diajukan: '2026-10-12', status: 'aktif', tujuan: 'Renovasi rumah',
    keputusan: { oleh: 'Rudi Hartanto', tanggal: '2026-10-14' }, pemberi: 'BPR Arta Sejahtera', noPerjanjian: '118/BPR-AS/X/2026', angsuran: 560_000, mulai: '2026-11', lampiran: 'perjanjian-118-BPR-AS.pdf',
    inst: mkInst('2026-11', Array(10).fill(560_000)),
  }),
]
LOANS.unshift(loan({ id: 'PJK-2026-0072', jenis: 'koperasi', nik: 'PPI-2024-0127', pokok: 2_000_000, tenor: 6, diajukan: '2026-10-25', diinputOleh: 'Siti Nurhaliza (aplikasi)', status: 'menunggu-sekretaris', sumber: 'aplikasi', inst: [], tujuan: 'Kebutuhan keluarga' }))
notify({ to: 'sekretaris', title: 'Pinjaman dari aplikasi', body: 'Pinjaman koperasi dari aplikasi — Siti Nurhaliza Rp 2.000.000 tenor 6 bulan', page: 'coop-loans' })
let pjkSeq = 73
let pnkSeq = 5

export const koperasiLoans = () => LOANS.filter((l) => l.jenis === 'koperasi')
export const nonLoans = () => LOANS.filter((l) => l.jenis === 'non')
export const lunasCount = (l: Loan) => l.inst.filter((i) => i.status === 'lunas').length
export const paidSum = (l: Loan) => l.inst.filter((i) => i.status === 'lunas').reduce((a, i) => a + i.nominal, 0)
/** Sisa pokok (Koperasi) atau sisa kewajiban (Non-Koperasi): pokok/jumlah angsuran dikurangi yang Lunas. */
export const sisaOf = (l: Loan) => (l.status === 'aktif' ? (l.jenis === 'non' ? l.inst.reduce((a, i) => a + i.nominal, 0) : l.pokok) - paidSum(l) : l.status === 'menunggu-sekretaris' || l.status === 'menunggu-ketua' || l.status === 'disetujui' ? l.pokok : 0)
export const totalAngsuran = (l: Loan) => l.inst.reduce((a, i) => a + i.nominal, 0)

/** Masa keanggotaan dan kelayakan pinjaman. */
export function eligibility(nik: string) {
  const m = memberOf(nik)
  if (!m) return { ok: false, bulan: 0, berhak: '', min: settingAt('masaMin') }
  const min = settingAt('masaMin')
  const bulan = monthsAsMember(m)
  return { ok: m.status === 'aktif' && bulan >= min, bulan, berhak: addMonths(m.sejak, min), min }
}
export function plafon(nik: string, excludeId?: string) {
  const wajib = balanceOf(nik).Wajib
  const kali = settingAt('pinjamanPlafondKali')
  const berjalan = koperasiLoans().filter((l) => l.nik === nik && l.id !== excludeId).reduce((a, l) => a + sisaOf(l), 0)
  return { wajib, kali, bruto: kali * wajib, berjalan, tersedia: Math.max(0, kali * wajib - berjalan) }
}
export function loanBlock(nik: string): string {
  const e = eligibility(nik)
  if (!e.ok) return `Masa keanggotaan ${e.bulan} bulan. Berhak mulai ${formatLongDate(e.berhak)}.`
  return ''
}
const formatLongDate = (iso: string) => `${Number(iso.slice(8, 10))} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
export function loanError(nik: string, pokok: number, tenor: number): string {
  const b = loanBlock(nik)
  if (b) return b
  if (!pokok) return 'Nominal wajib diisi'
  const p = plafon(nik)
  if (pokok > p.tersedia) return `Melebihi plafon tersedia ${rp(p.tersedia)}`
  const max = settingAt('pinjamanTenor')
  if (!tenor || tenor < 1 || tenor > max) return `Tenor 1–${max} bulan`
  return ''
}
export function createLoan(input: { nik: string; pokok: number; tenor: number; tujuan: string }, by: string): { id?: string; error?: string } {
  const err = loanError(input.nik, input.pokok, input.tenor)
  if (err) return { error: err }
  const id = `PJK-2026-${String(pjkSeq++).padStart(4, '0')}`
  LOANS.unshift(loan({ id, jenis: 'koperasi', nik: input.nik, pokok: input.pokok, tenor: input.tenor, tujuan: input.tujuan, diajukan: DEMO_TODAY, diinputOleh: by, status: 'menunggu-ketua', inst: [] }))
  bump()
  return { id }
}
export function decideLoan(id: string, approve: boolean, alasan: string, by: string) {
  const l = LOANS.find((x) => x.id === id)
  if (!l || l.status !== 'menunggu-ketua') return
  l.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan: approve ? undefined : alasan }
  // Koperasi: lanjut ke pencairan Bendahara. Non-Koperasi: pencatatan disetujui langsung Aktif.
  l.status = approve ? (l.jenis === 'koperasi' ? 'disetujui' : 'aktif') : 'ditolak'
  bump()
}
/** Pencairan (Bendahara): angsuran pertama di periode payroll pertama yang belum ditarik. */
export function cairkanLoan(id: string, input: { tanggal: string; ref: string; bukti: string }, by: string) {
  const l = LOANS.find((x) => x.id === id)
  if (!l || l.status !== 'disetujui') return
  l.cair = { oleh: by, ...input }
  l.status = 'aktif'
  l.inst = mkInst(nextOpenPeriod(), scheduleOf(l.pokok, l.tenor))
  bump()
}
export function cancelLoan(id: string, alasan: string, by: string) {
  const l = LOANS.find((x) => x.id === id)
  if (!l || (l.status !== 'menunggu-sekretaris' && l.status !== 'menunggu-ketua' && l.status !== 'disetujui')) return
  l.status = 'dibatalkan'
  l.batal = { oleh: by, tanggal: DEMO_TODAY, alasan }
  bump()
}
export function createNonKop(input: { nik: string; pemberi: string; noPerjanjian: string; pokok: number; tenor: number; angsuran: number; mulai: string; lampiran: string; tujuan: string }, by: string): { id?: string; error?: string } {
  const m = memberOf(input.nik)
  if (!m || m.status !== 'aktif') return { error: 'Hanya anggota aktif' }
  const id = `PNK-2026-${String(pnkSeq++).padStart(4, '0')}`
  LOANS.unshift(loan({ id, jenis: 'non', nik: input.nik, pokok: input.pokok, tenor: input.tenor, tujuan: input.tujuan, diajukan: DEMO_TODAY, diinputOleh: by, status: 'menunggu-ketua', pemberi: input.pemberi.trim(), noPerjanjian: input.noPerjanjian.trim(), angsuran: input.angsuran, mulai: input.mulai, lampiran: input.lampiran, inst: mkInst(input.mulai, Array(input.tenor).fill(input.angsuran)) }))
  bump()
  return { id }
}
/** Pelunasan dipercepat: Sekretaris mencatat; Bendahara mengonfirmasi, lalu seluruh sisa angsuran Lunas. */
export function catatPelunasan(id: string, input: { metode: 'Tunai' | 'Transfer'; bukti: string }, by: string) {
  const l = LOANS.find((x) => x.id === id)
  if (!l || l.status !== 'aktif' || l.pelunasan) return
  l.pelunasan = { nominal: sisaOf(l), metode: input.metode, bukti: input.bukti, oleh: by, tanggal: DEMO_TODAY, status: 'menunggu-bendahara' }
  bump()
}
export function konfirmasiPelunasan(id: string, by: string) {
  const l = LOANS.find((x) => x.id === id)
  if (!l || !l.pelunasan || l.pelunasan.status !== 'menunggu-bendahara') return
  l.pelunasan.status = 'dikonfirmasi'
  l.pelunasan.konfirmasi = { oleh: by, tanggal: DEMO_TODAY }
  for (const i of l.inst) if (i.status !== 'lunas') i.status = 'lunas'
  l.status = 'lunas'
  bump()
}
/** Setoran angsuran Non-Koperasi ke pemberi (Bendahara). */
export function setorNonKop(id: string, ke: number, input: { tanggal: string; bukti: string }, by: string) {
  const i = LOANS.find((x) => x.id === id)?.inst.find((x) => x.ke === ke)
  if (!i || i.status !== 'lunas' || i.setoran) return
  i.setoran = { ...input, oleh: by }
  bump()
}
export const loanReviewer = (l: Loan) => stageActor('ketua', l.nik)
export const loanDisburser = (l: Loan) => stageActor('bendahara', l.nik)
export const loanMutasi = (l: Loan) => {
  const rows: { tanggal: string; keterangan: string; debit: number; kredit: number; sisa: number }[] = []
  if (l.cair) rows.push({ tanggal: l.cair.tanggal, keterangan: `Pencairan ${l.id}`, debit: l.pokok, kredit: 0, sisa: l.pokok })
  let sisa = l.jenis === 'non' ? totalAngsuran(l) : l.pokok
  if (l.jenis === 'non') rows.push({ tanggal: l.diajukan, keterangan: `Pencatatan ${l.id}`, debit: sisa, kredit: 0, sisa })
  for (const i of l.inst.filter((x) => x.status === 'lunas')) {
    sisa -= i.nominal
    rows.push({ tanggal: `${i.periode}-28`, keterangan: `Angsuran ke-${i.ke} (payroll ${periodLabel(i.periode)})`, debit: 0, kredit: i.nominal, sisa })
  }
  return rows
}

/* ============================ Tagihan ke payroll ============================ */
export type BillLine = { nik: string; kind: 'kasbon' | 'angsuran' | 'pinjamanNon' | 'simpananWajib' | 'simpananSukarela'; jumlah: number; admin?: number }
/** Carry-over simpanan yang Tertahan (gaji gagal/ditunda), ikut ditagih di periode berikutnya. */
export const CARRY: { period: string; nik: string; kind: 'simpananWajib' | 'simpananSukarela'; jumlah: number }[] = []
/** Tagihan selain simpanan wajib: kasbon, angsuran Koperasi, angsuran Non-Koperasi, dan carry-over. */
export function extraBills(period: string): BillLine[] {
  const out: BillLine[] = []
  for (const k of KASBON) if (k.periodeTagih === period && ['ditagihkan', 'tertahan', 'lunas'].includes(k.status) && k.penyelesaian === 'potong') out.push({ nik: k.nik, kind: 'kasbon', jumlah: k.nominal, admin: k.admin })
  for (const l of LOANS) {
    if (l.status !== 'aktif' && l.status !== 'lunas') continue
    for (const i of l.inst) if (i.tagihPeriode === period && !(i.status === 'lunas' && l.pelunasan)) out.push({ nik: l.nik, kind: l.jenis === 'koperasi' ? 'angsuran' : 'pinjamanNon', jumlah: i.nominal })
  }
  for (const c of CARRY) if (c.period === period) out.push({ nik: c.nik, kind: c.kind, jumlah: c.jumlah })
  return out
}
/** Kirim tagihan: snapshot periode dibekukan dan angsuran menjadi Ditagihkan. */
export function markBillsSent(period: string, by: string) {
  BILL_STATE[period] = { status: 'terkirim', at: nowStamp().split(',')[0], by }
  for (const l of LOANS) for (const i of l.inst) if (i.tagihPeriode === period && (i.status === 'akan' || i.status === 'tertahan')) i.status = 'ditagihkan'
  bump()
}

/** Realisasi dikonfirmasi Bendahara: kasbon/angsuran Lunas, kecuali yang Tertahan, yang pindah ke periode berikutnya. */
export function applyRealisasi(period: string, holds: { nik: string; kind: string }[]) {
  const held = (nik: string, kind: string) => holds.some((h) => h.nik === nik && h.kind === kind)
  const next = nextOpenPeriod(period)
  for (const k of KASBON) {
    if (k.periodeTagih !== period || k.status !== 'ditagihkan') continue
    if (held(k.nik, 'kasbon')) { k.status = 'tertahan'; k.periodeTagih = next } else {
      k.status = 'lunas'
      postLedger({ tanggal: DEMO_TODAY, tipe: 'admin', nominal: k.admin, ref: k.id, label: `Biaya admin ${k.id} (Lunas, realisasi payroll)` })
    }
  }
  for (const l of LOANS) {
    if (l.status !== 'aktif') continue
    for (const i of l.inst) {
      if (i.tagihPeriode !== period || i.status !== 'ditagihkan') continue
      if (held(l.nik, l.jenis === 'koperasi' ? 'angsuran' : 'pinjamanNon')) { i.status = 'tertahan'; i.tagihPeriode = next } else i.status = 'lunas'
    }
    if (l.inst.length && l.inst.every((i) => i.status === 'lunas')) l.status = 'lunas'
  }
  bump()
}

export const memberOptions = () => activeMembers()

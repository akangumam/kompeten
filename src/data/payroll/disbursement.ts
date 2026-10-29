import { nowStamp } from '@/data/attendance'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { billsFor, billTotal, KOPERASI_LABEL, type BillPeriod, type KoperasiKind } from '@/data/koperasi-deductions'
import { isFinalized, isLocked, PAY_PERIODS, periodById, runRows, runsOf, type PayPeriod, type PayRow, type PeriodId, type RunCtx } from '@/data/payroll/runs'
import { receiveRealisasi } from '@/data/koperasi/realisasi'
import { maskRekening, salaryAt } from '@/data/payroll/salaries'
import { bump } from '@/data/payroll/store'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Hilir payroll Final: pengiriman slip, daftar pembayaran (transfer bank), dan rekonsiliasi potongan Koperasi.
 * Semua angka berasal dari baris run Final di runs.ts; tidak ada yang dihitung ulang di sini.
 */

/* ---------- baris periode Final ---------- */
/** Baris gaji dari run yang sudah Final/Closed (draft yang belum final tidak ikut). */
export function periodRows(id: PeriodId, ctx: RunCtx): PayRow[] {
  return runsOf(id).filter(isFinalized).flatMap((r) => runRows(r.id, ctx))
}
/** Ada minimal satu run (group) yang sudah Final. */
export const isFinal = (id: PeriodId) => runsOf(id).some(isFinalized)
/** Periode yang bisa dipilih di halaman hilir (periode yang kehadirannya belum berakhir masih terkunci). */
export const SELECTABLE_PERIODS: PayPeriod[] = PAY_PERIODS.filter((p) => !isLocked(p))
export const defaultPeriod = (): PeriodId => (isFinal('2026-10') ? '2026-10' : '2026-09')

/** Vendor penyedia tenaga Outsourcing; gaji Outsourcing dibayarkan ke vendor, bukan ke pegawai. */
export const VENDOR = { nama: 'PT Mitra Karya Sejahtera', bank: 'BCA', rek4: '7781', masked: 'BCA ••••7781' }

export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)!
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const shortPeriod = (id: PeriodId) => `${MON[Number(id.slice(5)) - 1]} ${id.slice(0, 4)}`

/* ---------- slip gaji ---------- */
export type SlipStatus = 'belum' | 'terkirim' | 'gagal'
export type SlipRec = { status: SlipStatus; reason?: string; at?: string }
/** Dua kegagalan pengiriman pada percobaan pertama (kontak pegawai tidak valid). */
const SLIP_FAIL: Record<string, string> = {
  'PPI-2016-0145': 'Nomor WhatsApp tidak aktif', // Budi Wijaya
  'PPI-2018-0320': 'Email tidak terdaftar', // Andi Utami
}

/* ---------- pembayaran ---------- */
export type FailReason = 'Rekening tidak aktif' | 'Nama tidak sesuai' | 'Lainnya'
export const FAIL_REASONS: FailReason[] = ['Rekening tidak aktif', 'Nama tidak sesuai', 'Lainnya']
export type Batch = { tanggal: string; ref: string; bukti: string | null; by: string; at: string }
export type RowPay =
  | { status: 'gagal'; alasan: FailReason; catatan: string; akun: string; by: string; at: string }
  | { status: 'ditransfer'; via: 'manual' | 'ulang'; metode?: string; tanggal: string; ref?: string; catatan?: string; bukti: string | null; by: string; at: string }
/** Kegagalan transfer yang muncul begitu batch bank ditandai Ditransfer (Andi Rahayu, BRI). */
const SEED_TRANSFER_FAIL: Record<string, { alasan: FailReason; catatan: string }> = {
  'PPI-2025-0265': { alasan: 'Rekening tidak aktif', catatan: 'Ditolak bank penerima' },
}
export type PayStatus = 'siap' | 'ditransfer' | 'gagal' | 'ditunda'

export type Recon = {
  sent?: { by: string; at: string }
  /** Nominal setoran selalu sama dengan total dipotong periode. */
  setoran?: { tanggal: string; bukti: string | null; by: string; at: string }
}
type Disb = { slips: Record<string, SlipRec>; slipTries: Record<string, number>; batches: Record<string, Batch>; rows: Record<string, RowPay>; recon: Recon; vendor?: Batch }

const store = new Map<PeriodId, Disb>()
export const BANK_ORDER = ['BCA', 'Mandiri', 'BRI', 'BNI']

export function disbOf(id: PeriodId): Disb {
  let d = store.get(id)
  if (d) return d
  d = { slips: {}, slipTries: {}, batches: {}, rows: {}, recon: {} }
  store.set(id, d)
  if (id === '2026-09') seedSeptember(d)
  return d
}

/** September sudah selesai seluruhnya: slip terkirim, semua bank ditransfer, rekonsiliasi disetor. */
function seedSeptember(d: Disb) {
  const p = periodById('2026-09')
  const at = '30 Sep 2026, 11.30 WIB'
  for (const e of ROSTER) {
    d.slips[e.nik] = { status: 'terkirim', at }
    const s = salaryAt(e, p.bayar)
    if (!s.nomorRekening) {
      d.rows[e.nik] = { status: 'ditransfer', via: 'manual', metode: 'Tunai', tanggal: p.bayar, catatan: 'Dibayar tunai, rekening belum tersedia', bukti: null, by: 'Yohanes Kristanto', at }
    } else if (!d.batches[s.bank]) {
      d.batches[s.bank] = { tanggal: p.bayar, ref: `TRF-202609-${s.bank.toUpperCase()}`, bukti: `bukti-${s.bank.toLowerCase()}-sep.pdf`, by: 'Yohanes Kristanto', at }
    }
  }
  d.recon = {
    sent: { by: 'Mira Andriani', at: '30 Sep 2026, 10.20 WIB' },
    setoran: { tanggal: '2026-09-30', bukti: 'setoran-koperasi-sep.pdf', by: 'Yohanes Kristanto', at: '30 Sep 2026, 15.10 WIB' },
  }
}

/* ---- slip ---- */
export const slipOf = (id: PeriodId, nik: string): SlipRec => disbOf(id).slips[nik] ?? { status: 'belum' }

/** Kirim slip lewat email + WhatsApp; hanya baris Belum dikirim/Gagal. Kegagalan seed hanya pada percobaan pertama. */
export function sendSlips(id: PeriodId, niks: string[]): { ok: number; gagal: number } {
  const d = disbOf(id)
  const at = nowStamp()
  let ok = 0
  let gagal = 0
  for (const nik of niks) {
    d.slipTries[nik] = (d.slipTries[nik] ?? 0) + 1
    const reason = SLIP_FAIL[nik]
    if (reason && d.slipTries[nik] === 1 && id === '2026-10') {
      d.slips[nik] = { status: 'gagal', reason, at }
      gagal++
    } else {
      d.slips[nik] = { status: 'terkirim', at }
      ok++
    }
  }
  bump()
  return { ok, gagal }
}

/* ---- pembayaran ---- */
export type PayItem = { row: PayRow; emp: RosterEmployee; bank: string; nomor: string; masked: string }
export function payItems(id: PeriodId, rows: PayRow[]): PayItem[] {
  const p = periodById(id)
  return rows.map((row) => {
    const emp = empOf(row.nik)
    if (row.vendor) return { row, emp, bank: VENDOR.bank, nomor: '', masked: VENDOR.masked }
    const s = salaryAt(emp, p.bayar)
    return { row, emp, bank: s.bank, nomor: s.nomorRekening, masked: maskRekening(s.bank, s.nomorRekening) }
  })
}

export function payStatus(id: PeriodId, it: PayItem): PayStatus {
  if (it.row.vendor) return disbOf(id).vendor ? 'ditransfer' : 'siap'
  const ov = disbOf(id).rows[it.row.nik]
  if (ov) return ov.status
  if (!it.nomor) return 'ditunda'
  return disbOf(id).batches[it.bank] ? 'ditransfer' : 'siap'
}

export type BankGroup = { bank: string; items: PayItem[]; total: number; batch?: Batch }
export function bankGroups(id: PeriodId, items: PayItem[]): BankGroup[] {
  const map = new Map<string, PayItem[]>()
  for (const it of items) if (it.nomor && !it.row.vendor) map.set(it.bank, [...(map.get(it.bank) ?? []), it])
  const banks = [...map.keys()].sort((a, b) => (BANK_ORDER.indexOf(a) + 1 || 99) - (BANK_ORDER.indexOf(b) + 1 || 99))
  return banks.map((bank) => {
    const list = map.get(bank)!
    return { bank, items: list, total: list.reduce((a, x) => a + x.row.neto, 0), batch: disbOf(id).batches[bank] }
  })
}

export type BatchStatus = 'siap' | 'sebagian' | 'selesai'
export function batchStatus(id: PeriodId, items: PayItem[]): BatchStatus {
  const sts = items.map((it) => payStatus(id, it))
  const done = sts.filter((s) => s === 'ditransfer').length
  if (sts.length > 0 && done === sts.length) return 'selesai'
  return done > 0 ? 'sebagian' : 'siap'
}

export function markBank(id: PeriodId, bank: string, items: PayItem[], input: { tanggal: string; ref: string; bukti: string | null }, by: string) {
  const d = disbOf(id)
  d.batches[bank] = { ...input, by, at: nowStamp() }
  if (id === '2026-10') {
    for (const it of items.filter((x) => x.bank === bank)) {
      const seed = SEED_TRANSFER_FAIL[it.row.nik]
      if (seed && !d.rows[it.row.nik]) d.rows[it.row.nik] = { status: 'gagal', ...seed, akun: it.nomor, by: 'Bank penerima', at: nowStamp() }
    }
  }
  bump()
}

export function markGagal(id: PeriodId, it: PayItem, alasan: FailReason, catatan: string, by: string) {
  disbOf(id).rows[it.row.nik] = { status: 'gagal', alasan, catatan, akun: it.nomor, by, at: nowStamp() }
  bump()
}

export function payManual(id: PeriodId, nik: string, input: { metode: string; tanggal: string; catatan: string; bukti: string | null }, by: string) {
  disbOf(id).rows[nik] = { status: 'ditransfer', via: 'manual', ...input, by, at: nowStamp() }
  bump()
}

/** Setoran gaji Outsourcing ke vendor ditandai Disetor (satu kali per periode). */
export function markVendor(id: PeriodId, input: { tanggal: string; ref: string; bukti: string | null }, by: string) {
  disbOf(id).vendor = { ...input, by, at: nowStamp() }
  bump()
}
export const vendorDeposit = (id: PeriodId) => disbOf(id).vendor

/** Rekening pegawai sudah diganti Payroll Officer sejak transfer gagal. */
export function accountUpdated(id: PeriodId, nik: string): boolean {
  const ov = disbOf(id).rows[nik]
  return ov?.status === 'gagal' && salaryAt(empOf(nik), DEMO_TODAY).nomorRekening !== ov.akun
}

export function retransfer(id: PeriodId, nik: string, input: { tanggal: string; ref: string; bukti: string | null }, by: string) {
  disbOf(id).rows[nik] = { status: 'ditransfer', via: 'ulang', ...input, by, at: nowStamp() }
  bump()
}

/** CSV file transfer bank; satu-satunya tempat nomor rekening ditampilkan lengkap. */
export function bankCsv(id: PeriodId, g: BankGroup): { name: string; text: string } {
  const label = `Gaji ${shortPeriod(id)}`
  const lines = ['No. Rekening,Nama,Nominal,Keterangan', ...g.items.map((it) => `"${it.nomor}","${it.emp.nama.replace(/"/g, '""')}",${it.row.neto},"${label} ${it.row.nik}"`)]
  return { name: `transfer-${g.bank.toLowerCase()}-${id.replace('-', '')}.csv`, text: `${lines.join('\r\n')}\r\n` }
}

/** CSV "Rincian ke vendor": pegawai Outsourcing beserta pendapatan dan neto yang disetor ke vendor. */
export function vendorCsv(id: PeriodId, rows: PayRow[]): { name: string; text: string } {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = ['NIP,Nama,Posisi,Hari hadir,Pendapatan,Potongan lain,Nominal disetor,Vendor', ...rows.map((r) => [r.nik, q(r.nama), q(r.posisi), r.hadir, r.pendapatan, r.potLain, r.neto, q(VENDOR.nama)].join(','))]
  return { name: `rincian-ke-vendor-${id.replace('-', '')}.csv`, text: `${lines.join('\r\n')}\r\n` }
}

/* ---------- rekonsiliasi potongan ---------- */
export const RECON_KINDS: KoperasiKind[] = ['kasbon', 'angsuran', 'simpananWajib', 'simpananSukarela', 'pinjamanNon']
export const RECON_LABEL: Record<KoperasiKind, string> = { ...KOPERASI_LABEL, kasbon: 'Kasbon + biaya admin' }
export type ReconStatus = 'cocok' | 'selisih' | 'menunggu' | 'tertahan'
export type ReconRow = {
  kind: KoperasiKind
  label: string
  pegawai: number
  ditagih: number
  dipotong: number
  selisih: number
  status: ReconStatus
  /** Pegawai yang membuat baris tidak langsung Cocok. */
  holds: { nik: string; nama: string; jumlah: number; status: 'ditunda' | 'gagal' }[]
}

/**
 * Pegawai yang potongannya sudah dipotong tetapi gajinya belum/tidak sampai (Ditunda atau Gagal) dan jenis potongan
 * yang ditahan karenanya. Selain pengecualian bernama ini, semua baris Cocok (spesifikasi Rekonsiliasi Oktober 2026).
 */
const TRACKED: Record<string, KoperasiKind[]> = {
  'PPI-2025-0152': ['simpananWajib'], // Budi Lestari: gaji ditunda sampai dibayar manual
  'PPI-2025-0265': ['angsuran'], // Andi Rahayu: mengikuti hasil transfer BRI
}

export function reconRows(id: PeriodId, rows: PayRow[]): ReconRow[] {
  const items = new Map(payItems(id, rows).map((it) => [it.row.nik, it]))
  const niks = new Set(rows.map((r) => r.nik))
  const bills = billsFor(id as BillPeriod).filter((b) => niks.has(b.nik))
  const out: ReconRow[] = []
  for (const kind of RECON_KINDS) {
    const mine = bills.filter((b) => b.kind === kind)
    if (mine.length === 0) continue
    const ditagih = mine.reduce((a, b) => a + billTotal(b), 0)
    const dipotong = rows.reduce((a, r) => a + r.koperasi.filter((k) => k.label.startsWith(KOPERASI_LABEL[kind])).reduce((x, k) => x + k.jumlah, 0), 0)
    const holds: ReconRow['holds'] = []
    for (const b of mine.filter((x) => TRACKED[x.nik]?.includes(kind))) {
      const it = items.get(b.nik)
      const st = it ? payStatus(id, it) : 'ditransfer'
      if (st === 'ditunda' || st === 'gagal') holds.push({ nik: b.nik, nama: empOf(b.nik).nama, jumlah: billTotal(b), status: st })
    }
    const selisih = dipotong - ditagih
    const status: ReconStatus = selisih !== 0 ? 'selisih' : holds.some((h) => h.status === 'gagal') ? 'tertahan' : holds.length ? 'menunggu' : 'cocok'
    out.push({ kind, label: RECON_LABEL[kind], pegawai: mine.length, ditagih, dipotong, selisih, status, holds })
  }
  return out
}

export function sendRecon(id: PeriodId, by: string, rows: PayRow[] = []) {
  const sent = { by, at: nowStamp() }
  disbOf(id).recon.sent = sent
  // Realisasi diteruskan ke Koperasi; potongan yang gajinya ditunda/gagal ditandai Tertahan.
  const holds = reconRows(id, rows).flatMap((r) => r.holds.map((h) => ({ nik: h.nik, kind: r.kind, status: h.status })))
  receiveRealisasi(id, new Set(rows.map((r) => r.nik)), holds, sent)
  bump()
}
export function recordSetoran(id: PeriodId, input: { tanggal: string; bukti: string | null }, by: string) {
  disbOf(id).recon.setoran = { ...input, by, at: nowStamp() }
  bump()
}

/* ---------- closing periode ---------- */
export type CloseCheck = { tone: 'ok' | 'blocking' | 'warn'; text: string; detail: string; page: 'payments' | 'payroll-components' | 'payslips'; label: string }

/** Checklist Closing Periode: pembayaran gaji dan pengiriman potongan Koperasi memblokir; kegagalan kirim slip hanya peringatan. */
export function closingChecks(id: PeriodId, rows: PayRow[]): CloseCheck[] {
  const items = payItems(id, rows)
  const sts = items.map((it) => payStatus(id, it))
  const count = (s: PayStatus) => sts.filter((x) => x === s).length
  const done = count('ditransfer')
  const open = [count('siap') && `${count('siap')} siap transfer`, count('gagal') && `${count('gagal')} gagal`, count('ditunda') && `${count('ditunda')} ditunda`].filter(Boolean).join(' · ')
  const paid = items.length > 0 && done === items.length
  const sent = disbOf(id).recon.sent
  const slipRows = rows.filter((r) => !r.vendor)
  const gagal = slipRows.filter((r) => slipOf(id, r.nik).status === 'gagal').length
  const belum = slipRows.filter((r) => slipOf(id, r.nik).status === 'belum').length
  return [
    {
      tone: paid ? 'ok' : 'blocking',
      text: paid ? 'Pembayaran gaji selesai' : 'Pembayaran gaji belum selesai',
      detail: paid ? (items.every((it) => it.row.vendor) ? `Gaji ${items.length.toLocaleString('id-ID')} pegawai Outsourcing disetor ke ${VENDOR.nama}` : `${done.toLocaleString('id-ID')} dari ${items.length.toLocaleString('id-ID')} pegawai ditransfer (termasuk pembayaran manual)`) : `${done.toLocaleString('id-ID')} dari ${items.length.toLocaleString('id-ID')} ditransfer · ${open}`,
      page: 'payments',
      label: 'Buka Daftar Pembayaran',
    },
    {
      tone: sent ? 'ok' : 'blocking',
      text: sent ? 'Potongan Koperasi dikirim' : 'Potongan Koperasi belum dikirim',
      detail: sent ? `Terkirim ${sent.at} oleh ${sent.by}` : 'Kirim dari Rekonsiliasi Potongan (Komponen & Potongan).',
      page: 'payroll-components',
      label: 'Buka Rekonsiliasi Potongan',
    },
    {
      tone: gagal || belum ? 'warn' : 'ok',
      text: gagal ? `${gagal} slip gagal kirim` : belum ? `${belum} slip belum dikirim` : 'Slip gaji terkirim',
      detail: gagal || belum ? 'Tidak memblokir closing; kirim ulang dari Slip Gaji.' : slipRows.length === 0 ? 'Slip diterbitkan oleh vendor' : `${slipRows.length.toLocaleString('id-ID')} slip terkirim lewat email dan WhatsApp`,
      page: 'payslips',
      label: 'Buka Slip Gaji',
    },
  ]
}

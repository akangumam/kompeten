import { billsFor, billTotal, type KoperasiKind } from '@/data/koperasi-deductions'
import { postMutation } from '@/data/koperasi/ledger'
import { applyRealisasi, CARRY, nextOpenPeriod, periodLabel } from '@/data/koperasi/loans'
import { bump } from '@/data/koperasi/store'
import { bump as bumpPayroll } from '@/data/payroll/store'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Realisasi potongan dari Payroll (dikirim lewat Rekonsiliasi › "Kirim ke Koperasi") dan konfirmasi Bendahara.
 * Saldo berubah hanya saat Bendahara mengonfirmasi; baris Tertahan tetap terbuka dan ikut ditagih di periode berikutnya.
 */
export type RealLine = { nik: string; kind: KoperasiKind; ditagih: number; dipotong: number; hold?: 'ditunda' | 'gagal' }
export type Realisasi = {
  period: string
  sent: { by: string; at: string }
  lines: RealLine[]
  status: 'menunggu' | 'dikonfirmasi'
  konfirmasi?: { oleh: string; tanggal: string }
}
export const REALISASI: Record<string, Realisasi> = {}
export const realisasiOf = (period: string) => REALISASI[period]
export const isConfirmed = (period: string) => REALISASI[period]?.status === 'dikonfirmasi'

/** Dipanggil Payroll saat Rekonsiliasi dikirim. `niks` = pegawai pada run Final; `holds` = potongan yang gajinya ditunda/gagal. */
export function receiveRealisasi(period: string, niks: Set<string>, holds: { nik: string; kind: KoperasiKind; status: 'ditunda' | 'gagal' }[], sent: { by: string; at: string }) {
  const lines: RealLine[] = billsFor(period)
    .filter((b) => niks.has(b.nik))
    .map((b) => {
      const hold = holds.find((h) => h.nik === b.nik && h.kind === b.kind)?.status
      return { nik: b.nik, kind: b.kind, ditagih: billTotal(b), dipotong: billTotal(b), hold }
    })
  REALISASI[period] = { period, sent, lines, status: 'menunggu' }
  bump()
}

export type KindSum = { kind: KoperasiKind; ditagih: number; dipotong: number; selisih: number; tertahan: RealLine[] }
export function summarize(r: Realisasi): KindSum[] {
  const kinds = [...new Set(r.lines.map((l) => l.kind))]
  return kinds.map((kind) => {
    const ls = r.lines.filter((l) => l.kind === kind)
    const ditagih = ls.reduce((a, l) => a + l.ditagih, 0)
    const dipotong = ls.reduce((a, l) => a + l.dipotong, 0)
    return { kind, ditagih, dipotong, selisih: dipotong - ditagih, tertahan: ls.filter((l) => l.hold) }
  })
}

/** Bendahara konfirmasi: posting mutasi simpanan, kasbon/angsuran Lunas, baris Tertahan bergulir ke periode berikutnya. */
export function konfirmasi(period: string, by: string) {
  const r = REALISASI[period]
  if (!r || r.status !== 'menunggu') return
  const next = nextOpenPeriod(period)
  for (const l of r.lines) {
    if (l.hold) {
      if (l.kind === 'simpananWajib' || l.kind === 'simpananSukarela') CARRY.push({ period: next, nik: l.nik, kind: l.kind, jumlah: l.ditagih })
      continue
    }
    if (l.kind === 'simpananWajib' || l.kind === 'simpananSukarela') {
      postMutation(l.nik, {
        tanggal: DEMO_TODAY, jenis: l.kind === 'simpananWajib' ? 'Wajib' : 'Sukarela', keterangan: l.kind === 'simpananWajib' ? 'Simpanan Wajib bulanan' : 'Simpanan Sukarela bulanan',
        debit: 0, kredit: l.ditagih, sumber: `Payroll ${periodLabel(period)}`, oleh: by,
      })
    }
  }
  applyRealisasi(period, r.lines.filter((l) => l.hold).map((l) => ({ nik: l.nik, kind: l.kind })))
  r.status = 'dikonfirmasi'
  r.konfirmasi = { oleh: by, tanggal: DEMO_TODAY }
  bump()
  bumpPayroll()
}

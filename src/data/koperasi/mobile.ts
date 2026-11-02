import { balanceOf } from '@/data/koperasi/ledger'
import {
  eligibility, kasbonWindow, kasbonUsed, KASBON, koperasiLoans, LOANS, plafon, bulanName, rp,
  type Kasbon, type Loan,
} from '@/data/koperasi/loans'
import { ELIGIBLE_JENIS, memberOf } from '@/data/koperasi/members'
import {
  MIN_PENCAIRAN, REGISTRATIONS, rekeningOf, RESERVING, WITHDRAWALS, validSukarela, validWajib,
  type Registration, type Withdrawal,
} from '@/data/koperasi/requests'
import { settingAt } from '@/data/koperasi/settings'
import { bump } from '@/data/koperasi/store'
import { jenisOf } from '@/data/master/jenis'
import { ROSTER } from '@/data/employees'
import { DEMO_TODAY } from '@/lib/today'

/** Verifikasi Sekretaris atas pengajuan anggota dari aplikasi; semua syarat dihitung ulang saat dibuka. */
export type Check = { label: string; ok: boolean; reason?: string }
export type AppKind = 'kasbon' | 'pinjaman' | 'pencairan' | 'pendaftaran'

const memberCheck = (nik: string): Check => ({ label: 'Anggota aktif', ok: memberOf(nik)?.status === 'aktif', reason: 'Anggota tidak aktif' })
const rekCheck = (nik: string): Check => ({ label: 'Rekening payroll tersedia', ok: rekeningOf(nik).ada, reason: 'Rekening anggota belum ada' })
/** Ada tagihan kasbon/angsuran yang Tertahan (tunggakan). */
export const tunggakan = (nik: string) => KASBON.some((k) => k.nik === nik && k.status === 'tertahan') || LOANS.some((l) => l.nik === nik && l.inst.some((i) => i.status === 'tertahan'))
const tunggakanCheck = (nik: string): Check => ({ label: 'Tidak ada tunggakan', ok: !tunggakan(nik), reason: 'Anggota masih memiliki tagihan Tertahan' })

export function kasbonChecks(k: Kasbon): Check[] {
  const w = kasbonWindow(k.diajukan)
  const others = kasbonUsed(k.nik, k.bulan) - k.nominal
  const sisa = settingAt('kasbonPlafond') - others
  const step = settingAt('kasbonStep')
  return [
    memberCheck(k.nik),
    { label: 'Dalam jendela tanggal', ok: w.open, reason: `Jendela kasbon ${w.bulanName} (tanggal ${w.dari}–${w.sampai}) tidak mencakup ${k.diajukan.slice(8, 10)} ${w.bulanName}` },
    { label: 'Dalam plafon', ok: k.nominal <= sisa && k.nominal >= settingAt('kasbonMin') && k.nominal % step === 0, reason: `Sisa plafon kasbon ${bulanName(k.bulan)} ${rp(Math.max(0, sisa))} (sudah dipakai ${rp(others)} oleh kasbon lain).` },
    tunggakanCheck(k.nik),
    rekCheck(k.nik),
  ]
}
export function loanChecks(l: Loan): Check[] {
  const e = eligibility(l.nik)
  const p = plafon(l.nik, l.id)
  const max = settingAt('pinjamanTenor')
  return [
    memberCheck(l.nik),
    { label: `Masa keanggotaan ≥ ${e.min} bulan`, ok: e.ok, reason: `Masa keanggotaan ${e.bulan} bulan` },
    { label: 'Dalam plafon', ok: l.pokok <= p.tersedia, reason: `Melebihi plafon tersedia ${rp(p.tersedia)}` },
    { label: `Tenor 1–${max} bulan`, ok: l.tenor >= 1 && l.tenor <= max, reason: `Tenor harus 1–${max} bulan` },
    tunggakanCheck(l.nik),
    rekCheck(l.nik),
  ]
}
export function wdChecks(w: Withdrawal): Check[] {
  const saldo = balanceOf(w.nik).Sukarela
  const dipesanLain = WITHDRAWALS.filter((x) => x.id !== w.id && x.nik === w.nik && RESERVING.includes(x.status)).reduce((a, x) => a + x.nominal, 0)
  const tersedia = saldo - dipesanLain
  return [
    memberCheck(w.nik),
    { label: 'Saldo sukarela cukup', ok: w.nominal <= tersedia, reason: `Melebihi saldo tersedia ${rp(Math.max(0, tersedia))}` },
    { label: `Nominal minimal ${rp(MIN_PENCAIRAN)}, kelipatan`, ok: w.nominal >= MIN_PENCAIRAN && validSukarela(w.nominal), reason: `Nominal minimal ${rp(MIN_PENCAIRAN)}` },
    rekCheck(w.nik),
  ]
}
export function regChecks(r: Registration): Check[] {
  const e = ROSTER.find((x) => x.nik === r.nik)
  return [
    { label: 'Pegawai aktif', ok: !!e, reason: 'Belum menjadi pegawai aktif' },
    { label: 'Jenis karyawan memenuhi syarat', ok: !!e && ELIGIBLE_JENIS.includes(jenisOf(e)), reason: e ? `Karyawan ${jenisOf(e)} tidak dapat menjadi anggota koperasi` : '' },
    { label: 'Belum menjadi anggota', ok: !memberOf(r.nik), reason: 'Sudah menjadi anggota' },
    { label: 'Simpanan wajib sesuai ketentuan', ok: validWajib(r.wajib), reason: 'Simpanan wajib di bawah minimum atau bukan kelipatan' },
    { label: 'Simpanan sukarela sesuai ketentuan', ok: validSukarela(r.sukarela), reason: 'Simpanan sukarela bukan kelipatan yang ditentukan' },
  ]
}
/** Alasan Teruskan nonaktif: syarat pertama yang tidak lolos; kosong bila semua lolos. */
export const blockReason = (checks: Check[]) => checks.find((c) => !c.ok)?.reason ?? ''

type Row = { status: string; verif?: { oleh: string; tanggal: string; catatan?: string }; keputusan?: { oleh: string; tanggal: string; alasan?: string } }
const find = (kind: AppKind, id: string): Row | undefined =>
  (kind === 'kasbon' ? KASBON : kind === 'pinjaman' ? LOANS : kind === 'pencairan' ? WITHDRAWALS : REGISTRATIONS).find((x) => x.id === id) as Row | undefined

/** Teruskan ke Ketua: status menjadi menunggu-ketua (alur berlanjut seperti biasa: Ketua → Bendahara). */
export function forwardToKetua(kind: AppKind, id: string, catatan: string, by: string) {
  const r = find(kind, id)
  if (!r || r.status !== 'menunggu-sekretaris') return
  r.verif = { oleh: by, tanggal: DEMO_TODAY, catatan: catatan.trim() || undefined }
  r.status = 'menunggu-ketua'
  bump()
}
/** Tolak oleh Sekretaris (alasan ≥ 10 karakter): status Ditolak, plafon/saldo yang dipesan langsung dilepas. */
export function rejectBySekretaris(kind: AppKind, id: string, alasan: string, by: string) {
  const r = find(kind, id)
  if (!r || r.status !== 'menunggu-sekretaris') return
  r.verif = { oleh: by, tanggal: DEMO_TODAY }
  r.status = 'ditolak'
  r.keputusan = { oleh: by, tanggal: DEMO_TODAY, alasan }
  bump()
}

export const appCount = {
  kasbon: () => KASBON.filter((k) => k.status === 'menunggu-sekretaris').length,
  pinjaman: () => koperasiLoans().filter((l) => l.status === 'menunggu-sekretaris').length,
  pencairan: () => WITHDRAWALS.filter((w) => w.status === 'menunggu-sekretaris').length,
  pendaftaran: () => REGISTRATIONS.filter((r) => r.status === 'menunggu-sekretaris').length,
}

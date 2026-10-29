import { WAJIB_MIN } from '@/data/koperasi/settings'
import { jenisOf } from '@/data/master/jenis'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { FORMER_OUTSOURCING } from '@/data/roster-gen'
import { addMonths, firstOfMonth } from '@/data/koperasi/dates'
import { bump } from '@/data/koperasi/store'
import { EXITED } from '@/data/profiles'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Anggota koperasi. Satu sumber untuk Koperasi dan potongan payroll (`isAnggota`).
 * Saldo tidak disimpan di sini: selalu dihitung dari mutasi buku besar (ledger.ts).
 */
export type SetoranJenis = 'Wajib' | 'Sukarela'
export type SetoranStep = { berlaku: string; nominal: number }
export type Member = {
  nik: string
  nama: string
  department: string
  statusKerja: string
  /** Tanggal efektif anggota (tanggal disetujui). */
  sejak: string
  status: 'aktif' | 'nonaktif'
  keluar?: string
  /** Jadwal nominal setoran per bulan; elemen pertama adalah setoran awal, sisanya perubahan. */
  wajib: SetoranStep[]
  sukarela: SetoranStep[]
}

// Nilai berlaku dibaca dari Pengaturan Koperasi (effective-dated); re-export sebagai live binding.
export { POKOK, STEP, WAJIB_MIN } from '@/data/koperasi/settings'
/** Jenis Karyawan yang boleh menjadi anggota koperasi. Outsourcing dan Magang tidak. */
export const ELIGIBLE_JENIS = ['Organik', 'Harian']
/** Saldo di buku besar dibukukan sampai payroll bulan ini (Oktober menunggu konfirmasi Bendahara). */
export const LEDGER_END = '2026-09'

/* ---------- penentuan anggota ---------- */
const h = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return (x >>> 0) / 4294967296
}

const NAMED = ['PPI-2024-0112', 'PPI-2021-0019', 'PPI-2023-0088', 'PPI-2024-0127', 'PPI-2025-0265', 'PPI-2024-0076', 'PPI-2018-0013', 'PPI-2022-0045']
/** Anggota wajib: tokoh demo, Bendahara (pengurus juga anggota), dan Budi Lestari (skenario Rekonsiliasi payroll). */
const FORCE_IN = new Set([...NAMED, 'PPI-2017-0012', 'PPI-2025-0152'])
/**
 * Bukan anggota: Yusuf Maulana (belum mendaftar), Lukman Hakim dan Bayu Setiawan (pendaftaran menunggu), serta 8 pegawai HR & GA
 * bekas Outsourcing (kini Kontrak, termasuk Andi Utami) yang belum didaftarkan; mereka dapat didaftarkan lewat "Daftarkan Anggota".
 */
const FORCE_OUT = new Set(['PPI-2024-0093', 'PPI-2025-0071', 'PPI-2025-0068', 'PPI-2018-0320', ...FORMER_OUTSOURCING])
export const ACTIVE_TARGET = 188

const eligibleHire = (e: RosterEmployee) => ELIGIBLE_JENIS.includes(jenisOf(e)) && e.tanggalMasuk <= '2026-06-30'
const memberNiks = (() => {
  const pool = ROSTER.filter((e) => eligibleHire(e) && !FORCE_OUT.has(e.nik))
  const base = pool.filter((e) => FORCE_IN.has(e.nik) || h(e.nik + '#kop') < 0.74)
  const set = new Set(base.map((e) => e.nik))
  const rank = (n: string) => h(n + '#kop')
  if (set.size > ACTIVE_TARGET) {
    const drop = [...set].filter((n) => !FORCE_IN.has(n)).sort((a, b) => rank(b) - rank(a)).slice(0, set.size - ACTIVE_TARGET)
    drop.forEach((n) => set.delete(n))
  } else if (set.size < ACTIVE_TARGET) {
    const add = pool.map((e) => e.nik).filter((n) => !set.has(n)).sort((a, b) => rank(a) - rank(b)).slice(0, ACTIVE_TARGET - set.size)
    add.forEach((n) => set.add(n))
  }
  return set
})()
/** Dipakai potongan payroll: Simpanan Wajib dipotong dari setiap anggota aktif. */
export const isAnggota = (nik: string) => memberNiks.has(nik)

/* ---------- data anggota ---------- */
const NAMED_DATA: Record<string, { sejak: string; sukarela: SetoranStep[] }> = {
  'PPI-2024-0112': { sejak: '2024-04-01', sukarela: [] }, // Rizky
  'PPI-2021-0019': { sejak: '2021-12-01', sukarela: [{ berlaku: '2022-01-01', nominal: 150_000 }, { berlaku: '2022-04-01', nominal: 0 }] }, // Joko
  'PPI-2023-0088': { sejak: '2023-05-01', sukarela: [{ berlaku: '2024-10-01', nominal: 200_000 }, { berlaku: '2026-07-01', nominal: 0 }] }, // Eko
  'PPI-2024-0127': { sejak: '2024-03-01', sukarela: [{ berlaku: '2026-04-01', nominal: 100_000 }, { berlaku: '2026-10-01', nominal: 0 }] }, // Siti
  'PPI-2025-0265': { sejak: '2026-01-01', sukarela: [] }, // Andi Rahayu
  'PPI-2024-0076': { sejak: '2024-08-01', sukarela: [{ berlaku: '2025-01-01', nominal: 200_000 }, { berlaku: '2025-07-01', nominal: 0 }] }, // Ratna
  'PPI-2018-0013': { sejak: '2019-01-01', sukarela: [{ berlaku: '2024-01-01', nominal: 250_000 }, { berlaku: '2025-01-01', nominal: 0 }] }, // Rudi
  'PPI-2022-0045': { sejak: '2022-06-01', sukarela: [] }, // Wahyu
  'PPI-2017-0140': { sejak: '2026-10-01', sukarela: [] }, // Fajar Siregar: anggota baru (uji masa keanggotaan 3 bulan)
}

function sejakFor(e: RosterEmployee): string {
  const start = addMonths(firstOfMonth(e.tanggalMasuk), 1 + Math.floor(h(e.nik + '#sj') * 4))
  return start < '2019-01-01' ? '2019-01-01' : start > '2026-06-01' ? '2026-06-01' : start
}

function build(): Member[] {
  const out: Member[] = []
  for (const e of ROSTER) {
    if (!memberNiks.has(e.nik)) continue
    const nd = NAMED_DATA[e.nik]
    const sejak = nd?.sejak ?? sejakFor(e)
    out.push({
      nik: e.nik, nama: e.nama, department: e.department, statusKerja: e.statusKerja, sejak, status: 'aktif',
      wajib: [{ berlaku: sejak, nominal: WAJIB_MIN }],
      sukarela: [{ berlaku: sejak, nominal: 0 }, ...(nd?.sukarela ?? [])],
    })
  }
  // Anggota yang masa kerjanya sudah berakhir tetap tercatat dengan status Nonaktif (pengembalian simpanan di tahap berikutnya).
  for (const x of EXITED.filter((e) => ['PPI-2022-0047', 'PPI-2001-0004'].includes(e.nik))) {
    const sejak = x.nik === 'PPI-2001-0004' ? '2019-01-01' : '2022-04-01'
    out.push({
      nik: x.nik, nama: x.nama, department: x.department, statusKerja: x.statusKerja, sejak, status: 'nonaktif', keluar: x.keluar.tanggal,
      wajib: [{ berlaku: sejak, nominal: WAJIB_MIN }], sukarela: [{ berlaku: sejak, nominal: 0 }],
    })
  }
  return out
}

export const MEMBERS: Member[] = build()
export const memberOf = (nik: string) => MEMBERS.find((m) => m.nik === nik)
export const activeMembers = () => MEMBERS.filter((m) => m.status === 'aktif')

/** Nominal setoran yang berlaku pada tanggal tertentu. */
export const nominalAt = (steps: SetoranStep[], date: string) => [...steps].reverse().find((s) => s.berlaku <= date)?.nominal ?? 0
export const setoranNow = (m: Member, jenis: SetoranJenis, date = DEMO_TODAY) => nominalAt(jenis === 'Wajib' ? m.wajib : m.sukarela, date)
export const stepsOf = (m: Member, jenis: SetoranJenis) => (jenis === 'Wajib' ? m.wajib : m.sukarela)
/** Perubahan = semua langkah setelah setoran awal. */
export const changesOf = (m: Member, jenis: SetoranJenis) => stepsOf(m, jenis).slice(1)

export function addMember(input: { nik: string; nama: string; department: string; statusKerja: string; wajib: number; sukarela: number }, sejak: string) {
  MEMBERS.push({ ...input, sejak, status: 'aktif', wajib: [{ berlaku: sejak, nominal: input.wajib }], sukarela: [{ berlaku: sejak, nominal: input.sukarela }] })
  bump()
}
export function pushStep(nik: string, jenis: SetoranJenis, step: SetoranStep) {
  const m = memberOf(nik)
  if (!m) return
  stepsOf(m, jenis).push(step)
  bump()
}

export const monthsAsMember = (m: Member, date = DEMO_TODAY) => {
  const [ya, ma] = m.sejak.split('-').map(Number)
  const [yb, mb] = date.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

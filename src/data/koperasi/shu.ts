import { balanceOf, mutationsOf } from '@/data/koperasi/ledger'
import { expenseByPos, getCoopFinanceSummary } from '@/data/koperasi/finance'
import { KSB } from '@/data/koperasi/ksb'
import { KASBON, LOANS } from '@/data/koperasi/loans'
import { activeMembers, MEMBERS, type Member } from '@/data/koperasi/members'
import { POS_ANGGARAN, posOf, settingAt } from '@/data/koperasi/settings'
import { bump } from '@/data/koperasi/store'
import { DEMO_TODAY } from '@/lib/today'

/**
 * SHU = total pendapatan − total beban, dibaca dari buku keuangan Koperasi dan data anggota (tidak ada input manual).
 * Tahun buku Sementara dihitung ulang mengikuti data; SHU Final adalah snapshot yang tersimpan dan tidak pernah dihitung ulang.
 */
export type ShuKey = 'pinjam' | 'wajib' | 'sukarela' | 'pengurus'
export const SHU_GROUPS: { key: ShuKey; nama: string; basis: string; setting: 'shuPinjam' | 'shuWajib' | 'shuSukarela' | 'shuPengurus' }[] = [
  { key: 'pinjam', nama: 'Jasa Anggota Meminjam', basis: 'Dana dipinjam dalam tahun buku: pokok Pinjaman Koperasi + Kasbon yang dicairkan', setting: 'shuPinjam' },
  { key: 'wajib', nama: 'Jasa Simpanan Wajib', basis: 'Saldo Simpanan Wajib terkonfirmasi', setting: 'shuWajib' },
  { key: 'sukarela', nama: 'Jasa Simpanan Sukarela', basis: 'Saldo Simpanan Sukarela terkonfirmasi', setting: 'shuSukarela' },
  { key: 'pengurus', nama: 'Pengurus', basis: 'Dibagi rata ke Ketua, Sekretaris, dan Bendahara', setting: 'shuPengurus' },
]
export const defaultPersen = () => SHU_GROUPS.map((g) => settingAt(g.setting))

export type MemberShare = { nik: string; nama: string; department: string; pinjam: number; wajib: number; sukarela: number; shares: [number, number, number, number]; total: number }
export type ShuReport = {
  year: number
  persen: number[]
  pendapatan: { admin: number; udSelisih: number; udMasuk?: number; udKeluar?: number; total: number }
  beban: { kode: string; nama: string; nominal: number }[]
  bebanTotal: number
  shu: number
  pools: number[]
  members: MemberShare[]
  /** Sisa pembulatan per kelompok (pool − jumlah bagian anggota). */
  sisa: number[]
  basisTotals: number[]
}
export type ShuSnapshot = ShuReport & { final: { oleh: string; tanggal: string; rat?: string } }

/* ---------- dana dipinjam ---------- */
const hash = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) }
  return x >>> 0
}
/** Kasbon Jan–Agu 2026 (data migrasi): Rp 96.000.000 tersebar di 120 anggota; Rizky Rp 1.200.000, Joko dan Andi Rahayu Rp 0. */
const RIZKY = 'PPI-2024-0112'
function migratedKasbon(target: number, count: number, fixed: Record<string, number>, exclude: string[], pool: Member[], salt: string): Record<string, number> {
  const rest = pool.filter((m) => !(m.nik in fixed) && !exclude.includes(m.nik)).sort((a, b) => hash(a.nik + salt) - hash(b.nik + salt)).slice(0, count - Object.keys(fixed).length)
  const out: Record<string, number> = { ...fixed }
  rest.forEach((m) => { out[m.nik] = 500_000 + 50_000 * (hash(m.nik + salt + 'a') % 11) })
  let diff = target - Object.values(out).reduce((a, n) => a + n, 0)
  for (let i = 0; diff !== 0 && i < 100_000; i++) {
    const m = rest[i % rest.length]
    const step = diff > 0 ? 50_000 : -50_000
    const next = out[m.nik] + step
    if (next >= 100_000 && next <= 1_500_000) { out[m.nik] = next; diff -= step }
  }
  return out
}
const KASBON_2026 = migratedKasbon(96_000_000, 120, { [RIZKY]: 1_200_000 }, ['PPI-2021-0019', 'PPI-2025-0265', 'PPI-2017-0140'], MEMBERS.filter((m) => m.status === 'aktif'), '#k26')
export const MIG_KASBON_TOTAL = 96_000_000

export function danaDipinjam(year: number): Record<string, number> {
  const out: Record<string, number> = year === 2026 ? { ...KASBON_2026 } : {}
  const add = (nik: string, n: number) => { out[nik] = (out[nik] ?? 0) + n }
  for (const k of KASBON) if (k.cair && k.cair.tanggal.startsWith(String(year)) && k.status !== 'ditolak' && k.status !== 'dibatalkan') add(k.nik, k.nominal)
  for (const l of LOANS) if (l.jenis === 'koperasi' && l.cair && l.cair.tanggal.startsWith(String(year))) add(l.nik, l.pokok)
  return out
}

/* ---------- pembagian ---------- */
const saldoAt = (nik: string, jenis: 'Wajib' | 'Sukarela', date?: string) => {
  if (!date) return balanceOf(nik)[jenis]
  return mutationsOf(nik).filter((m) => m.jenis === jenis && m.tanggal <= date).reduce((a, m) => a + m.kredit - m.debit, 0)
}
const KSB_NIKS = [KSB.ketua.nik, KSB.sekretaris.nik, KSB.bendahara.nik]

/** Bagian tiap anggota: floor(pool × basis ÷ total basis); sisa pembulatan = pool − jumlah bagian. */
export function distribute(basis: { nik: string; nama: string; department: string; pinjam: number; wajib: number; sukarela: number }[], pools: number[]) {
  const tot = [basis.reduce((a, b) => a + b.pinjam, 0), basis.reduce((a, b) => a + b.wajib, 0), basis.reduce((a, b) => a + b.sukarela, 0)]
  const pengurus = basis.filter((b) => KSB_NIKS.includes(b.nik))
  const members: MemberShare[] = basis.map((b) => {
    const s0 = tot[0] > 0 ? Math.floor((pools[0] * b.pinjam) / tot[0]) : 0
    const s1 = tot[1] > 0 ? Math.floor((pools[1] * b.wajib) / tot[1]) : 0
    const s2 = tot[2] > 0 ? Math.floor((pools[2] * b.sukarela) / tot[2]) : 0
    const s3 = KSB_NIKS.includes(b.nik) && pengurus.length > 0 ? Math.floor(pools[3] / pengurus.length) : 0
    return { ...b, shares: [s0, s1, s2, s3], total: s0 + s1 + s2 + s3 }
  })
  const sisa = pools.map((p, i) => p - members.reduce((a, m) => a + m.shares[i], 0))
  return { members, sisa, basisTotals: [...tot, 0] }
}

const poolsOf = (shu: number, persen: number[]) => persen.map((p) => (shu > 0 ? Math.floor((shu * p) / 100) : 0))

/** Hitung SHU tahun buku dari buku keuangan dan data anggota (Sementara). */
export function computeLive(year: number, persen: number[]): ShuReport {
  const f = getCoopFinanceSummary(year)
  const beban = expenseByPos(year).map((e) => ({ kode: e.pos, nama: posOf(e.pos)?.nama ?? e.pos, nominal: e.nominal })).sort((a, b) => POS_ANGGARAN.findIndex((x) => x.kode === a.kode) - POS_ANGGARAN.findIndex((x) => x.kode === b.kode))
  const bebanTotal = beban.reduce((a, b) => a + b.nominal, 0)
  const shu = f.pendapatan - bebanTotal
  const pools = poolsOf(shu, persen)
  const dana = danaDipinjam(year)
  const basis = activeMembers().map((m) => ({ nik: m.nik, nama: m.nama, department: m.department, pinjam: dana[m.nik] ?? 0, wajib: saldoAt(m.nik, 'Wajib'), sukarela: saldoAt(m.nik, 'Sukarela') }))
  const d = distribute(basis, pools)
  return {
    year, persen, pendapatan: { admin: f.pendapatanAdmin, udSelisih: f.udSelisih, udMasuk: f.udMasuk, udKeluar: f.udKeluar, total: f.pendapatan },
    beban, bebanTotal, shu, pools, members: d.members, sisa: d.sisa, basisTotals: d.basisTotals,
  }
}

/* ---------- tahun buku ---------- */
export const SHU_YEARS = [2026, 2025]
const STATE: Record<number, { persen: number[]; final?: ShuSnapshot }> = {}

/** SHU 2025 Final: snapshot dibuat sekali dari data akhir 2025 dan disimpan. Anggota yang bergabung 2026 tidak termasuk. */
function snapshot2025(): ShuSnapshot {
  const persen = [25, 40, 20, 15]
  const shu = 14_600_000
  const pools = poolsOf(shu, persen)
  const joined = MEMBERS.filter((m) => m.sejak <= '2025-12-31' && (!m.keluar || m.keluar > '2025-12-31'))
  const dana = migratedKasbon(88_500_000, 110, {}, ['PPI-2025-0265', 'PPI-2017-0140'], joined, '#k25')
  const basis = joined.map((m) => ({ nik: m.nik, nama: m.nama, department: m.department, pinjam: dana[m.nik] ?? 0, wajib: saldoAt(m.nik, 'Wajib', '2025-12-31'), sukarela: saldoAt(m.nik, 'Sukarela', '2025-12-31') }))
  const d = distribute(basis, pools)
  return {
    year: 2025, persen, pendapatan: { admin: 5_950_000, udSelisih: 35_400_000, total: 41_350_000 },
    beban: [{ kode: 'OPS-001', nama: 'Administrasi & ATK', nominal: 3_900_000 }, { kode: 'OPS-002', nama: 'Biaya Bank & Transfer', nominal: 1_150_000 }, { kode: 'OPS-003', nama: 'Rapat Pengurus & RAT', nominal: 3_700_000 }, { kode: 'KPG-001', nama: 'Honor Pengurus', nominal: 18_000_000 }],
    bebanTotal: 26_750_000, shu, pools, members: d.members, sisa: d.sisa, basisTotals: d.basisTotals,
    final: { oleh: 'Rudi Hartanto', tanggal: '2026-02-14', rat: '2026-03-07' },
  }
}
STATE[2025] = { persen: [25, 40, 20, 15], final: snapshot2025() }

export const finalOf = (year: number) => STATE[year]?.final
export const persenOf = (year: number) => STATE[year]?.persen ?? defaultPersen()
export function savePersen(year: number, persen: number[]) {
  if (finalOf(year)) return
  STATE[year] = { ...STATE[year], persen }
  bump()
}
export function resetPersen(year: number) {
  if (finalOf(year)) return
  STATE[year] = { ...STATE[year], persen: defaultPersen() }
  bump()
}
/** Laporan tahun buku: snapshot bila Final, selain itu dihitung dari data terkini dengan persentase yang sedang diisi. */
export function reportOf(year: number, persen?: number[]): ShuReport {
  const f = finalOf(year)
  return f ?? computeLive(year, persen ?? persenOf(year))
}
export function shuBlockers(year: number, persen: number[], shu: number): string[] {
  const out: string[] = []
  const total = persen.reduce((a, n) => a + n, 0)
  if (total !== 100) out.push(`Total persentase ${total}% (harus 100%)`)
  if (shu <= 0) out.push('SHU bernilai ≤ 0')
  if (DEMO_TODAY < `${year + 1}-01-01`) out.push(`Tahun buku ${year} belum berakhir (31 Des ${year})`)
  return out
}
export function finalizeShu(year: number, persen: number[], by: string): string {
  const live = computeLive(year, persen)
  const b = shuBlockers(year, persen, live.shu)
  if (b.length) return b[0]
  STATE[year] = { persen, final: { ...live, final: { oleh: by, tanggal: DEMO_TODAY } } }
  bump()
  return ''
}

export function shuCsv(r: ShuReport): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const head = ['NIP', 'Nama', 'Department', 'Dana dipinjam', 'Saldo Wajib', 'Saldo Sukarela', 'Jasa pinjaman', 'Jasa wajib', 'Jasa sukarela', 'Pengurus', 'Total SHU']
  const rows = r.members.map((m) => [m.nik, q(m.nama), q(m.department), m.pinjam, m.wajib, m.sukarela, ...m.shares, m.total].join(','))
  return `${[head.join(','), ...rows].join('\r\n')}\r\n`
}

import { addMonths, lastDayOfMonth, ym } from '@/data/koperasi/dates'
import { LEDGER_END, memberOf, MEMBERS, nominalAt, POKOK, type Member } from '@/data/koperasi/members'
import { bump } from '@/data/koperasi/store'

/**
 * Buku besar simpanan: hanya bertambah (append-only). Setiap perubahan saldo adalah satu baris mutasi;
 * saldo selalu dihitung dari mutasi, tidak pernah diedit.
 */
export type Jenis = 'Pokok' | 'Wajib' | 'Sukarela'
export const JENIS: Jenis[] = ['Pokok', 'Wajib', 'Sukarela']
export type Mutation = {
  id: string
  nik: string
  tanggal: string
  jenis: Jenis
  keterangan: string
  debit: number
  kredit: number
  /** Saldo jenis ini setelah mutasi. */
  saldo: number
  sumber: string
  oleh: string
}
type Raw = Omit<Mutation, 'id' | 'saldo'>

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const payrollLabel = (month: string) => `Payroll ${MON[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`

/** Pencairan masa lalu yang sudah Dicairkan (juga tercatat di requests.ts). */
export const SEED_DEBITS: { nik: string; tanggal: string; nominal: number; no: string }[] = [
  { nik: 'PPI-2023-0088', tanggal: '2026-06-15', nominal: 1_500_000, no: 'PCS-2026-0009' },
]

function seedRows(m: Member): Raw[] {
  const rows: Raw[] = [{ nik: m.nik, tanggal: m.sejak, jenis: 'Pokok', keterangan: 'Simpanan Pokok', debit: 0, kredit: POKOK, sumber: payrollLabel(ym(m.sejak)), oleh: 'Sistem payroll' }]
  const end = m.keluar ? ym(addMonths(m.keluar, -1)) : LEDGER_END
  for (let mo = ym(m.sejak) + '-01'; ym(mo) <= end; mo = addMonths(mo, 1)) {
    const tanggal = lastDayOfMonth(mo)
    const wajib = nominalAt(m.wajib, mo)
    if (wajib > 0) rows.push({ nik: m.nik, tanggal, jenis: 'Wajib', keterangan: 'Simpanan Wajib bulanan', debit: 0, kredit: wajib, sumber: payrollLabel(ym(mo)), oleh: 'Sistem payroll' })
    const suk = nominalAt(m.sukarela, mo)
    if (suk > 0) rows.push({ nik: m.nik, tanggal, jenis: 'Sukarela', keterangan: 'Simpanan Sukarela bulanan', debit: 0, kredit: suk, sumber: payrollLabel(ym(mo)), oleh: 'Sistem payroll' })
  }
  for (const d of SEED_DEBITS.filter((x) => x.nik === m.nik)) {
    rows.push({ nik: m.nik, tanggal: d.tanggal, jenis: 'Sukarela', keterangan: `Pencairan ${d.no}`, debit: d.nominal, kredit: 0, sumber: `Pencairan ${d.no}`, oleh: 'Nina Marlina' })
  }
  return rows
}

const store = new Map<string, Mutation[]>()
let seq = 1

function runningSaldo(raw: Raw[], start: Record<Jenis, number>): Mutation[] {
  const sorted = raw.map((r, i) => ({ r, i })).sort((a, b) => a.r.tanggal.localeCompare(b.r.tanggal) || a.i - b.i)
  const saldo = { ...start }
  return sorted.map(({ r }) => {
    saldo[r.jenis] += r.kredit - r.debit
    return { ...r, id: `M-${String(seq++).padStart(6, '0')}`, saldo: saldo[r.jenis] }
  })
}

/** Mutasi urut kronologis (terlama dulu). */
export function mutationsOf(nik: string): Mutation[] {
  let list = store.get(nik)
  if (!list) {
    const m = memberOf(nik)
    list = m ? runningSaldo(seedRows(m), { Pokok: 0, Wajib: 0, Sukarela: 0 }) : []
    store.set(nik, list)
  }
  return list
}

export type Balance = Record<Jenis, number>
export function balanceOf(nik: string): Balance {
  const out: Balance = { Pokok: 0, Wajib: 0, Sukarela: 0 }
  for (const x of mutationsOf(nik)) out[x.jenis] = x.saldo
  return out
}

/** Membukukan satu mutasi baru di akhir buku besar anggota. */
export function postMutation(nik: string, input: Omit<Raw, 'nik'>) {
  const list = mutationsOf(nik)
  const prev = balanceOf(nik)[input.jenis]
  list.push({ ...input, nik, id: `M-${String(seq++).padStart(6, '0')}`, saldo: prev + input.kredit - input.debit })
  bump()
}

export const totalSimpanan = () => MEMBERS.filter((m) => m.status === 'aktif').reduce((a, m) => {
  const b = balanceOf(m.nik)
  return a + b.Pokok + b.Wajib + b.Sukarela
}, 0)

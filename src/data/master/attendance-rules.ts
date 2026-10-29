import { DEMO_TODAY } from '@/lib/today'

export type RuleMap = {
  toleransi: { menit: number }
  istirahat: { jam: number }
  pembulatan: { menit: number }
  batasLembur: { hari: number; minggu: number }
  cutoff: { dari: number; sampai: number }
}
export type RuleKey = keyof RuleMap
export type RuleEntry<T> = { from: string; value: T; by?: string; at?: string; alasan?: string }
type Versioned<T> = RuleEntry<T>[]

export const RULES: { [K in RuleKey]: Versioned<RuleMap[K]> } = {
  toleransi: [{ from: '2020-01-01', value: { menit: 0 } }],
  istirahat: [{ from: '2020-01-01', value: { jam: 8 } }],
  pembulatan: [{ from: '2020-01-01', value: { menit: 30 } }],
  batasLembur: [{ from: '2020-01-01', value: { hari: 4, minggu: 18 } }],
  cutoff: [
    { from: '2020-01-01', value: { dari: 21, sampai: 20 }, by: 'Data awal' },
    { from: '2026-11-01', value: { dari: 24, sampai: 23 }, by: 'Admin HRD', at: '2026-10-28', alasan: 'Penyesuaian cut-off sesuai kebijakan Primaplast' },
  ],
}

export const RULE_LABEL: Record<RuleKey, string> = {
  toleransi: 'Toleransi telat',
  istirahat: 'Istirahat minimal antar shift',
  pembulatan: 'Pembulatan realisasi lembur',
  batasLembur: 'Batas lembur hari kerja',
  cutoff: 'Periode cut-off',
}

export function rule<K extends RuleKey>(key: K, date: string = DEMO_TODAY): RuleMap[K] {
  const list = [...RULES[key]].sort((a, b) => a.from.localeCompare(b.from))
  return ([...list].reverse().find((x) => x.from <= date) ?? list[0]).value
}

export function ruleText<K extends RuleKey>(key: K, v: RuleMap[K]): string {
  const x = v as RuleMap[RuleKey]
  switch (key) {
    case 'toleransi':
      return `${(x as RuleMap['toleransi']).menit} menit`
    case 'istirahat':
      return `${(x as RuleMap['istirahat']).jam} jam`
    case 'pembulatan':
      return `Ke bawah per ${(x as RuleMap['pembulatan']).menit} menit`
    case 'batasLembur': {
      const b = x as RuleMap['batasLembur']
      return `${b.hari} jam/hari, ${b.minggu} jam/minggu`
    }
    case 'cutoff': {
      const c = x as RuleMap['cutoff']
      return `Tanggal ${c.dari} s/d ${c.sampai}`
    }
  }
  return ''
}

/* ---------- periode absensi/payroll yang dibangkitkan dari aturan cut-off ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const two = (n: number) => String(n).padStart(2, '0')
export type AttPeriod = {
  id: string
  label: string
  start: string
  end: string
  /** "21 Sep – 20 Okt" */
  cutoff: string
  /** Periode peralihan: aturan cut-off berubah di periode ini sehingga panjangnya tidak biasa. */
  transisi: boolean
}
const prevId = (id: string) => {
  const [y, m] = id.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${two(m - 1)}`
}
/** Aturan cut-off yang berlaku untuk periode berlabel bulan akhir `id` (aturan dengan "berlaku mulai" dalam bulan tersebut ikut dipakai). */
const cutoffFor = (id: string) => rule('cutoff', `${id}-28`)
const addDay = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const dm = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`

/** Periode dinamai menurut bulan akhirnya. Awal = sehari setelah akhir periode sebelumnya, sehingga tidak ada celah atau tumpang tindih. */
export function periodForId(id: string): AttPeriod {
  const [y, m] = id.split('-').map(Number)
  const end = `${id}-${two(cutoffFor(id).sampai)}`
  const pid = prevId(id)
  const start = addDay(`${pid}-${two(cutoffFor(pid).sampai)}`)
  return {
    id,
    label: `${MONTHS[m - 1]} ${y}`,
    start,
    end,
    cutoff: `${dm(start)} – ${dm(end)}`,
    transisi: cutoffFor(id).sampai !== cutoffFor(pid).sampai,
  }
}
export const periodSelectLabel = (p: AttPeriod) => `${p.label} · ${p.cutoff}${p.transisi ? ' (transisi)' : ''}`
export const TRANSISI_NOTE = (p: AttPeriod) => {
  const full = (iso: string) => `${dm(iso)} ${iso.slice(0, 4)}`
  return `Periode transisi karena perubahan cut-off (${dm(p.start)} – ${full(p.end)}).`
}
/** Semua periode yang ditampilkan di pemilih periode, terbaru di atas. */
export const ATT_PERIOD_IDS = ['2026-12', '2026-11', '2026-10', '2026-09']
export const attPeriods = () => ATT_PERIOD_IDS.map(periodForId)
export const periodContaining = (iso: string): AttPeriod => {
  const [y, m] = iso.split('-').map(Number)
  for (const id of [`${y}-${two(m)}`, m === 12 ? `${y + 1}-01` : `${y}-${two(m + 1)}`]) {
    const p = periodForId(id)
    if (iso >= p.start && iso <= p.end) return p
  }
  return periodForId(`${y}-${two(m)}`)
}

const nextId = (id: string) => {
  const [y, m] = id.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${two(m + 1)}`
}
/** Hari pertama periode berikutnya yang masih terbuka untuk perubahan aturan. */
export function nextPeriodStart(today: string = DEMO_TODAY): string {
  return periodForId(nextId(periodContaining(today).id)).start
}

/** Helper kecil untuk komponen chart bersama. */

export type ChartRow = Record<string, unknown>

const numFmt = new Intl.NumberFormat('id-ID')
export const fmtNum = (n: number) => numFmt.format(n)

/** Lebar sumbu kategori (px) menyesuaikan label terpanjang agar tidak terpotong. */
export function categoryAxisWidth(data: readonly object[], categoryKey: string, min = 48, max = 240) {
  const longest = data.reduce<number>((a, row) => Math.max(a, String((row as ChartRow)[categoryKey] ?? '').length), 0)
  return Math.min(max, Math.max(min, Math.round(longest * 7.5 + 18)))
}

/** Ruang kanan (px) untuk label nilai pada bar horizontal. */
export function labelRoom(data: readonly object[], keys: string[], format: (n: number) => string) {
  let longest = 0
  for (const row of data) for (const k of keys) {
    const v = (row as ChartRow)[k]
    if (typeof v === 'number') longest = Math.max(longest, format(v).length)
  }
  return Math.max(32, longest * 8 + 16)
}

/** Label nilai bar: nilai 0 atau kosong tidak diberi label. */
export const barLabel = (format: (n: number) => string) => (v: unknown) => {
  const n = Number(v)
  return v == null || !Number.isFinite(n) || n === 0 ? '' : format(n)
}

const STEPS = (() => {
  const out: number[] = []
  for (let m = 1; m <= 1e9; m *= 10) out.push(m, m * 5)
  return out
})()

/** Domain sumbu Y yang dibulatkan ke kelipatan rapi (maks. 6 interval). */
export function niceDomain(values: (number | null | undefined)[]): { domain: [number, number]; ticks: number[] } {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!nums.length) return { domain: [0, 10], ticks: [0, 5, 10] }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const step = STEPS.find((s) => Math.ceil(max / s) - Math.floor(min / s) <= 6) ?? STEPS[STEPS.length - 1]
  const lo = Math.floor(min / step) * step
  let hi = Math.ceil(max / step) * step
  if (hi === lo) hi = lo + step
  const ticks: number[] = []
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t)
  return { domain: [lo, hi], ticks }
}

/** Urutkan payload legend mengikuti urutan kunci `config`, bukan urutan internal Recharts. */
export function sortLegend<T extends { dataKey?: unknown }>(payload: readonly T[] | undefined, order: string[]): T[] | undefined {
  if (!payload) return undefined
  return [...payload].sort((a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey)))
}

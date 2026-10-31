const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** "2026-10-31" → "31 Oktober 2026". */
export function formatDateLong(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_FULL[m - 1]} ${y}`
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
function say(n: number): string {
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${say(n - 10)} belas`
  if (n < 100) return `${say(Math.floor(n / 10))} puluh${n % 10 ? ` ${say(n % 10)}` : ''}`
  if (n < 200) return `seratus${n > 100 ? ` ${say(n - 100)}` : ''}`
  if (n < 1000) return `${say(Math.floor(n / 100))} ratus${n % 100 ? ` ${say(n % 100)}` : ''}`
  if (n < 2000) return `seribu${n > 1000 ? ` ${say(n - 1000)}` : ''}`
  const units: [number, string][] = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']]
  for (const [size, name] of units) {
    if (n >= size) return `${say(Math.floor(n / size))} ${name}${n % size ? ` ${say(n % size)}` : ''}`
  }
  return ''
}

/** 5750968 → "Lima juta tujuh ratus lima puluh ribu sembilan ratus enam puluh delapan rupiah". */
export function terbilang(n: number) {
  const words = n === 0 ? 'nol' : say(Math.abs(Math.round(n)))
  return `${n < 0 ? 'Minus ' : ''}${words.charAt(0).toUpperCase()}${words.slice(1)} rupiah`.replace('Minus M', 'Minus m')
}

export const pct = (n: number, d = 1) => `${n.toFixed(d).replace('.', ',')}%`
export const num = (n: number) => n.toLocaleString('id-ID')


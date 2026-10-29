import { harianPphAt, JKK_RATES, kesAt, terCategory, terRate, tkAt, type TerCategory } from '@/data/payroll/statutory'

/**
 * Pembulatan uang (AGENTS §8): BPJS ke rupiah terdekat, PPh 21 ke bawah (rupiah penuh).
 * Total selalu dijumlahkan dari baris yang sudah dibulatkan.
 */
export const roundBpjs = (n: number) => Math.round(n)

export type BpjsParts = {
  upah: number
  kesCo: number
  jhtCo: number
  jpCo: number
  jkk: number
  jkkLabel: string
  jkkRate: number
  jkm: number
  kesP: number
  jhtP: number
  jpP: number
  bpjsPegawai: number
  /** Beban perusahaan BPJS seluruhnya (Kes + JHT + JP + JKK + JKM). */
  bebanCo: number
  /** Bagian beban perusahaan yang masuk bruto PPh 21 (Kes + JKK + JKM). */
  bebanBruto: number
}

/** Iuran BPJS dari upah (Gaji Pokok + Tunjangan Jabatan) pada tanggal acuan. Persen dihitung dari bilangan bulat basis poin. */
export function bpjsOf(upah: number, date: string): BpjsParts {
  const kes = kesAt(date)
  const tk = tkAt(date)
  const upahKes = Math.min(upah, kes.batas)
  const upahJp = Math.min(upah, tk.jpBatas)
  const part = (base: number, persen: number) => roundBpjs((base * Math.round(persen * 100)) / 10000)
  const jkkRate = JKK_RATES[tk.jkk]
  const kesCo = part(upahKes, kes.perusahaan)
  const jhtCo = part(upah, tk.jhtPerusahaan)
  const jpCo = part(upahJp, tk.jpPerusahaan)
  const jkk = part(upah, jkkRate)
  const jkm = part(upah, tk.jkm)
  const kesP = part(upahKes, kes.pegawai)
  const jhtP = part(upah, tk.jhtPegawai)
  const jpP = part(upahJp, tk.jpPegawai)
  return {
    upah, kesCo, jhtCo, jpCo, jkk, jkkRate, jkkLabel: `${tk.jkk} ${String(jkkRate).replace('.', ',')}%`, jkm, kesP, jhtP, jpP,
    bpjsPegawai: kesP + jhtP + jpP,
    bebanCo: kesCo + jhtCo + jpCo + jkk + jkm,
    bebanBruto: kesCo + jkk + jkm,
  }
}

export type PphResult = { kategori: TerCategory; tarif: number; beyond: boolean; pph: number }

/** PPh 21 TER bulanan: tarif menurut kategori PTKP × penghasilan bruto, dibulatkan ke bawah. */
export function pphOf(bruto: number, ptkp: string): PphResult {
  const kategori = terCategory(ptkp)
  const { rate, beyond } = terRate(kategori, bruto)
  return { kategori, tarif: rate, beyond, pph: Math.floor((bruto * Math.round(rate * 100)) / 10000) }
}

/**
 * PPh 21 pegawai harian (tidak tetap): upah harian ≤ batas harian → 0; bila penghasilan bruto sebulan di atas batas bulanan
 * dipakai TER bulanan seperti pegawai tetap.
 */
export function pphHarian(bruto: number, upahHarian: number, ptkp: string, date: string): PphResult {
  const h = harianPphAt(date)
  if (bruto > h.batasBulanan) return pphOf(bruto, ptkp)
  const kategori = terCategory(ptkp)
  return { kategori, tarif: 0, beyond: false, pph: upahHarian <= h.batasHarian ? 0 : pphOf(bruto, ptkp).pph }
}

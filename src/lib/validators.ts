export const digitsOnly = (s: string) => s.replace(/\D/g, '')

export function formatHp(raw: string) {
  const d = digitsOnly(raw)
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8)].filter(Boolean).join('-')
}

export const formatRupiah = (raw: string) => {
  const d = digitsOnly(raw).replace(/^0+/, '')
  return d ? `Rp ${Number(d).toLocaleString('id-ID')}` : ''
}

export type FormatKey = 'hp' | 'ktp' | 'email' | 'npwp' | 'bpjsKes' | 'bpjsTk' | 'rekening' | 'rupiah'

type Rule = {
  helper: string
  error: string
  maxDigits?: number
  inputMode: 'tel' | 'numeric' | 'email'
  display: (stored: string) => string
  sanitize: (typed: string) => string
  valid: (stored: string) => boolean
}

const digitsRule = (maxDigits: number, valid: (n: number) => boolean) => ({
  maxDigits,
  inputMode: 'numeric' as const,
  display: (v: string) => v,
  sanitize: (t: string) => digitsOnly(t).slice(0, maxDigits),
  valid: (v: string) => valid(v.length),
})

export const RULES: Record<FormatKey, Rule> = {
  hp: {
    helper: 'Format: 0812-3456-7890',
    error: 'Nomor HP harus diawali 08 dan berisi 10–13 digit',
    inputMode: 'tel',
    display: formatHp,
    sanitize: (t) => digitsOnly(t).slice(0, 13),
    valid: (v) => /^08\d{8,11}$/.test(v),
  },
  ktp: {
    helper: '16 digit angka',
    error: 'NIK (KTP) harus 16 digit angka',
    ...digitsRule(16, (n) => n === 16),
  },
  email: {
    helper: 'Contoh: nama@email.com',
    error: 'Format email tidak valid',
    inputMode: 'email',
    display: (v) => v,
    sanitize: (t) => t.trim(),
    valid: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
  },
  npwp: {
    helper: '15 atau 16 digit angka',
    error: 'NPWP harus 15 atau 16 digit angka',
    ...digitsRule(16, (n) => n === 15 || n === 16),
  },
  bpjsKes: {
    helper: '13 digit angka',
    error: 'No. BPJS Kesehatan harus 13 digit angka',
    ...digitsRule(13, (n) => n === 13),
  },
  bpjsTk: {
    helper: '11 digit angka',
    error: 'No. BPJS Ketenagakerjaan harus 11 digit angka',
    ...digitsRule(11, (n) => n === 11),
  },
  rekening: {
    helper: '6–20 digit angka',
    error: 'Nomor Rekening harus 6–20 digit angka',
    ...digitsRule(20, (n) => n >= 6 && n <= 20),
  },
  rupiah: {
    helper: 'Contoh: Rp 1.000.000',
    error: 'Nominal harus lebih dari 0',
    inputMode: 'numeric',
    display: formatRupiah,
    sanitize: (t) => digitsOnly(t).replace(/^0+/, ''),
    valid: (v) => Number(v) > 0,
  },
}

// Empty optional values are valid; required-field checks live elsewhere.
export const formatError = (key: FormatKey, stored: string) =>
  stored && !RULES[key].valid(stored) ? RULES[key].error : ''

export const ALASAN_ERROR = 'Alasan minimal 10 karakter'
export const validAlasan = (v: string) => v.trim().length >= 10 && !/^[\d\s.,-]+$/.test(v.trim())

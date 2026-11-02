import { DEMO_TODAY } from '@/lib/today'

/**
 * Audit log keamanan (append-only). UI-nya ada di Pengaturan Sistem › Audit Log (hanya baca).
 * Backend wajib menyimpan log ini di sisi server dan tidak boleh dapat diubah atau dihapus dari aplikasi.
 */
export type AuditEvent =
  | 'login-berhasil'
  | 'login-gagal'
  | 'akun-terkunci'
  | 'otp-berhasil'
  | 'otp-gagal'
  | 'ganti-peran-aktif'
  | 'ganti-kata-sandi'
  | 'minta-reset-kata-sandi'
  | 'reset-kata-sandi'
  | 'reset-sandi-admin'
  | 'akun-dibuka-kunci'
  | 'akun-ditangguhkan'
  | 'akses-dipulihkan'
  | 'perubahan-peran'
  | 'kebijakan-diubah'
  | 'presentasi-perspektif'
  | 'aksi-presentasi'
  | 'logout'
  | 'sesi-habis'

export const EVENT_LABEL: Record<AuditEvent, string> = {
  'login-berhasil': 'Login berhasil',
  'login-gagal': 'Login gagal',
  'akun-terkunci': 'Akun terkunci',
  'otp-berhasil': 'OTP berhasil',
  'otp-gagal': 'OTP gagal',
  'ganti-peran-aktif': 'Ganti peran aktif',
  'ganti-kata-sandi': 'Ganti kata sandi',
  'minta-reset-kata-sandi': 'Permintaan reset kata sandi',
  'reset-kata-sandi': 'Reset kata sandi (tautan)',
  'reset-sandi-admin': 'Reset kata sandi oleh admin',
  'akun-dibuka-kunci': 'Buka kunci akun',
  'akun-ditangguhkan': 'Akses ditangguhkan',
  'akses-dipulihkan': 'Akses dipulihkan',
  'perubahan-peran': 'Perubahan peran',
  'kebijakan-diubah': 'Kebijakan keamanan diubah',
  'presentasi-perspektif': 'Mode presentasi: perspektif',
  'aksi-presentasi': 'Aksi dalam mode presentasi',
  logout: 'Keluar',
  'sesi-habis': 'Sesi habis',
}
const GAGAL: AuditEvent[] = ['login-gagal', 'akun-terkunci', 'otp-gagal']

export type SecurityAuditEntry = {
  id: number
  /** ISO dengan offset WIB. */
  at: string
  event: AuditEvent
  /** Email pelaku (atau email yang dicoba saat login gagal). */
  email: string
  nip?: string
  peran?: string
  detail: string
  /** Nama tampilan pelaku; mode presentasi: "Presentasi (sebagai …)". */
  pengguna?: string
  hasil: 'Berhasil' | 'Gagal'
}

const LOG: SecurityAuditEntry[] = []
let seq = 0
let presenter: (() => string | undefined) | undefined
export const setPresenter = (fn: () => string | undefined) => { presenter = fn }

/** Waktu demo: tanggal DEMO_TODAY, jam mengikuti jam nyata (WIB), supaya urut dengan data seed. */
const nowWib = () => {
  const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false })
  return `${DEMO_TODAY}T${t}+07:00`
}

let version = 0
const subs = new Set<() => void>()
export const subscribeAudit = (f: () => void) => { subs.add(f); return () => subs.delete(f) }
export const auditVersion = () => version

export function logSecurity(e: Omit<SecurityAuditEntry, 'id' | 'at' | 'hasil'> & { at?: string; hasil?: 'Berhasil' | 'Gagal' }) {
  const pengguna = presenter?.() ?? e.pengguna
  LOG.push(Object.freeze({ ...e, pengguna, id: ++seq, at: e.at ?? nowWib(), hasil: e.hasil ?? (GAGAL.includes(e.event) ? 'Gagal' : 'Berhasil') }) as SecurityAuditEntry)
  version++
  subs.forEach((f) => f())
}
/** Terbaru di atas. */
export const securityAuditLog = (): readonly SecurityAuditEntry[] => LOG


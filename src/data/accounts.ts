import { EXITED } from '@/data/profiles'
import { ROSTER } from '@/data/employees'
import { logSecurity } from '@/data/audit-log'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { ROLE_ORDER } from '@/lib/access'
import { ROLE_LABEL, type CurrentUser, type Role } from '@/data/users'

/*
 * SIMULASI tanpa backend. Kata sandi dibandingkan apa adanya di memori dan kode OTP ditampilkan di toast.
 * Backend WAJIB menyimpan kata sandi sebagai hash (argon2/bcrypt + salt), mengirim OTP sungguhan lewat email,
 * membatasi laju percobaan di server, dan tidak pernah mengembalikan OTP/token reset ke klien.
 */

export type AccountStatus = 'Aktif' | 'Terkunci' | 'Nonaktif'
export type Account = {
  nip: string
  nama: string
  emailKantor: string
  /** Peran yang ditetapkan Super Admin. Atasan (punya bawahan) dan Karyawan dihitung otomatis dan tidak disimpan di sini. */
  peran: Role[]
  status: AccountStatus
  wajibGantiSandi: boolean
  gagalBerturut: number
  terkunciSampai?: number
  loginTerakhir?: string
  masaJabatan?: string
  nonaktifSejak?: string
  kataSandi: string
}

export const DEMO_PASSWORD = 'Demo#2026'

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
export function emailFor(nama: string, taken: Set<string>): string {
  const w = nama.trim().split(/\s+/)
  const first = slug(w[0]), last = slug(w[w.length - 1])
  const base = w.length > 1 ? `${first}.${last}` : first
  let email = `${base}@${SECURITY_POLICY.domain}`
  for (let i = 2; taken.has(email); i++) email = `${base}${i}@${SECURITY_POLICY.domain}`
  taken.add(email)
  return email
}

/** NIP akun demo → peran web yang ditetapkan. */
const DEMO_ROLES: Record<string, { peran: Role[]; masaJabatan?: string; wajibGantiSandi?: boolean }> = {
  'PPI-2016-0322': { peran: ['hr_recruitment'] }, // Okta Maulana
  'PPI-2016-0323': { peran: ['hr_personalia', 'hr_development'] }, // Teddy Syahputra (multi-peran)
  'PPI-2015-0326': { peran: ['hr_recruitment'], wajibGantiSandi: true }, // Wawan Kurniawan (login pertama)
  'PPI-2016-0003': { peran: ['manager'] }, // Lestari Wulandari
  'PPI-2020-0031': { peran: ['payroll'] }, // Mira Andriani
  'PPI-2017-0009': { peran: ['finance'] }, // Yohanes Kristanto
  'PPI-2024-0076': { peran: ['sekretaris'], masaJabatan: '2025–2027' }, // Ratna Dewi
  'PPI-2017-0012': { peran: ['bendahara'], masaJabatan: '2025–2027' }, // Nina Marlina
  'PPI-2018-0013': { peran: ['ketua'], masaJabatan: '2025–2027' }, // Rudi Hartanto
  'PPI-2024-0058': { peran: ['superadmin'] }, // Taufik Hidayat (IT Support)
}

export const ACCOUNTS: Account[] = []
const taken = new Set<string>()
for (const e of ROSTER) {
  const d = DEMO_ROLES[e.nik]
  ACCOUNTS.push({
    nip: e.nik, nama: e.nama, emailKantor: emailFor(e.nama, taken), peran: d?.peran ?? [], status: 'Aktif',
    wajibGantiSandi: !!d?.wajibGantiSandi, gagalBerturut: 0, masaJabatan: d?.masaJabatan, kataSandi: DEMO_PASSWORD,
  })
}
const dayAfter = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }
// Pegawai keluar (offboarding Selesai): nonaktif mulai H+1 tanggal keluar, di web maupun Flutter.
for (const x of EXITED) {
  ACCOUNTS.push({
    nip: x.nik, nama: x.nama, emailKantor: emailFor(x.nama, taken), peran: [], status: 'Nonaktif', nonaktifSejak: dayAfter(x.keluar.tanggal),
    wajibGantiSandi: false, gagalBerturut: 0, kataSandi: DEMO_PASSWORD,
  })
}

const byEmail = (email: string) => ACCOUNTS.find((a) => a.emailKantor === email.trim().toLowerCase())
export const accountOf = (nip: string) => ACCOUNTS.find((a) => a.nip === nip)
export const emailTakenBy = (email: string, exceptNip?: string) => ACCOUNTS.find((a) => a.emailKantor === email.trim().toLowerCase() && a.nip !== exceptNip)

const supervisors = new Set(ROSTER.map((e) => e.atasanId))
/** Peran web akun: peran tetapan + Atasan otomatis (punya bawahan langsung), diurutkan menurut matriks. */
export function rolesOf(a: Account): Role[] {
  if (a.status !== 'Aktif' && a.status !== 'Terkunci') return []
  const r = new Set<Role>(a.peran)
  if (supervisors.has(a.nip)) r.add('supervisor')
  return ROLE_ORDER.filter((x) => r.has(x))
}
export const needsOtp = (roles: Role[]) => roles.some((r) => SECURITY_POLICY.otpRoles.includes(r))

export function userOf(a: Account, role: Role): CurrentUser {
  const initials = a.nama.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const emp = ROSTER.find((e) => e.nik === a.nip)
  const jabatan = role === 'supervisor' ? `Atasan · ${emp?.posisi ?? ''}`.replace(/ · $/, '') : ROLE_LABEL[role]
  // HR & GA Manager tidak memakai NIP pada logika persetujuan lama (id khusus 'manager').
  return { role, nama: a.nama, jabatan, initials, nik: role === 'manager' ? undefined : a.nip }
}

// ---------- Waktu (WIB) ----------
const wibClock = (t: number) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false }).replace(':', '.')
const wibDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// ---------- Login ----------
export type LoginResult =
  | { ok: true; account: Account; roles: Role[]; otp: boolean; mustChange: boolean }
  | { ok: false; kind: 'salah'; sisa?: number; message: string }
  | { ok: false; kind: 'terkunci' | 'nonaktif' | 'mobile'; message: string }

export function attemptLogin(emailRaw: string, password: string): LoginResult {
  const a = byEmail(emailRaw)
  const email = emailRaw.trim().toLowerCase()
  const generic = 'Email atau kata sandi salah'
  if (!a) {
    logSecurity({ event: 'login-gagal', email, detail: 'Email tidak terdaftar' })
    return { ok: false, kind: 'salah', message: generic }
  }
  if (a.status === 'Terkunci' && a.terkunciSampai && a.terkunciSampai <= Date.now()) {
    a.status = 'Aktif'; a.gagalBerturut = 0; a.terkunciSampai = undefined
  }
  if (a.status === 'Terkunci') {
    logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Akun terkunci' })
    return { ok: false, kind: 'terkunci', message: `Akun dikunci sampai ${wibClock(a.terkunciSampai ?? Date.now())} WIB karena ${SECURITY_POLICY.maxFailed} kali gagal.` }
  }
  if (a.kataSandi !== password) {
    if (a.status === 'Nonaktif') {
      logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Kata sandi salah (akun nonaktif)' })
      return { ok: false, kind: 'salah', message: generic }
    }
    a.gagalBerturut += 1
    if (a.gagalBerturut >= SECURITY_POLICY.maxFailed) {
      a.status = 'Terkunci'
      a.terkunciSampai = Date.now() + SECURITY_POLICY.lockMinutes * 60_000
      logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Kata sandi salah' })
      logSecurity({ event: 'akun-terkunci', email, nip: a.nip, detail: `${SECURITY_POLICY.maxFailed} kali gagal berturut-turut; dikunci ${SECURITY_POLICY.lockMinutes} menit` })
      return { ok: false, kind: 'terkunci', message: `Akun dikunci sampai ${wibClock(a.terkunciSampai)} WIB karena ${SECURITY_POLICY.maxFailed} kali gagal.` }
    }
    const sisa = SECURITY_POLICY.maxFailed - a.gagalBerturut
    logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: `Kata sandi salah; sisa ${sisa} percobaan` })
    return { ok: false, kind: 'salah', sisa, message: `${generic}. Sisa ${sisa} percobaan sebelum akun dikunci.` }
  }
  if (a.status === 'Nonaktif') {
    logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Akun nonaktif' })
    return { ok: false, kind: 'nonaktif', message: `Akun nonaktif sejak ${wibDate(a.nonaktifSejak ?? '2026-01-01')}. Hubungi HR Personalia.` }
  }
  const roles = rolesOf(a)
  if (roles.length === 0 && !a.wajibGantiSandi) {
    logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Hanya peran Karyawan: diarahkan ke aplikasi Mobile' })
    return { ok: false, kind: 'mobile', message: 'Akun Anda untuk aplikasi KOMPETEN Mobile. Silakan masuk melalui aplikasi di ponsel Anda.' }
  }
  a.gagalBerturut = 0
  return { ok: true, account: a, roles, otp: needsOtp(roles), mustChange: a.wajibGantiSandi }
}

export function completeLogin(a: Account) {
  a.loginTerakhir = new Date().toISOString()
  logSecurity({ event: 'login-berhasil', email: a.emailKantor, nip: a.nip, detail: 'Login berhasil' })
}

// ---------- OTP (simulasi) ----------
type OtpState = { code: string; exp: number; sentAt: number; salah: number }
const OTPS = new Map<string, OtpState>()
export const maskEmail = (email: string) => { const [u, d] = email.split('@'); return `${u[0]}***@${d}` }
export function issueOtp(a: Account): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  OTPS.set(a.nip, { code, exp: Date.now() + SECURITY_POLICY.otpMinutes * 60_000, sentAt: Date.now(), salah: 0 })
  return code
}
export const otpSentAt = (a: Account) => OTPS.get(a.nip)?.sentAt ?? 0
export function verifyOtp(a: Account, code: string): 'ok' | 'salah' | 'kedaluwarsa' | 'habis' {
  const o = OTPS.get(a.nip)
  if (!o || o.exp < Date.now()) { logSecurity({ event: 'otp-gagal', email: a.emailKantor, nip: a.nip, detail: 'Kode kedaluwarsa' }); return 'kedaluwarsa' }
  if (o.code !== code) {
    o.salah += 1
    logSecurity({ event: 'otp-gagal', email: a.emailKantor, nip: a.nip, detail: `Kode salah (${o.salah}/3)` })
    if (o.salah >= 3) { OTPS.delete(a.nip); return 'habis' }
    return 'salah'
  }
  OTPS.delete(a.nip)
  logSecurity({ event: 'otp-berhasil', email: a.emailKantor, nip: a.nip, detail: 'OTP benar' })
  return 'ok'
}

// ---------- Kata sandi ----------
export type PwCheck = { len: boolean; huruf: boolean; angka: boolean; beda: boolean }
export const checkPassword = (pw: string, old: string): PwCheck => ({
  len: pw.length >= SECURITY_POLICY.minPassword,
  huruf: /[A-Za-z]/.test(pw),
  angka: /\d/.test(pw),
  beda: pw.length > 0 && pw !== old,
})
export const passwordOk = (c: PwCheck) => c.len && c.huruf && c.angka && c.beda

export function setPassword(a: Account, pw: string, kind: 'ganti' | 'reset') {
  a.kataSandi = pw
  a.wajibGantiSandi = false
  a.gagalBerturut = 0
  logSecurity({ event: kind === 'reset' ? 'reset-kata-sandi' : 'ganti-kata-sandi', email: a.emailKantor, nip: a.nip, detail: kind === 'reset' ? 'Kata sandi direset lewat tautan' : 'Kata sandi diganti' })
}

// ---------- Lupa kata sandi (simulasi) ----------
const RESETS = new Map<string, { nip: string; exp: number }>()
/** Mengembalikan token HANYA bila email terdaftar dan aktif; UI tetap menampilkan pesan yang sama. */
export function requestReset(emailRaw: string): string | null {
  const a = byEmail(emailRaw)
  logSecurity({ event: 'minta-reset-kata-sandi', email: emailRaw.trim().toLowerCase(), nip: a?.nip, detail: a ? 'Email terdaftar' : 'Email tidak terdaftar' })
  if (!a || a.status === 'Nonaktif') return null
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
  RESETS.set(token, { nip: a.nip, exp: Date.now() + SECURITY_POLICY.resetMinutes * 60_000 })
  return token
}
/** Tautan sekali pakai: dikonsumsi saat kata sandi baru disimpan. */
export function resetAccount(token: string): Account | undefined {
  const r = RESETS.get(token)
  return r && r.exp > Date.now() ? accountOf(r.nip) : undefined
}
export const consumeReset = (token: string) => { RESETS.delete(token) }

/** Galat email kantor saat Verifikasi & Aktifkan Draft Pegawai ('' bila valid). */
export function emailKantorError(email: string, exceptNip?: string): string {
  const v = email.trim().toLowerCase()
  if (!v) return 'Email kantor wajib diisi'
  if (!v.endsWith(`@${SECURITY_POLICY.domain}`) || v.indexOf('@') < 1 || v.split('@').length !== 2) return `Domain email harus @${SECURITY_POLICY.domain}`
  const dup = ACCOUNTS.find((a) => a.emailKantor === v && a.nip !== exceptNip)
  return dup ? `Email sudah dipakai ${dup.nama}` : ''
}

// ---------- Akun baru dari Draft Pegawai ----------
export function registerAccount(nip: string, nama: string, emailKantor: string) {
  if (accountOf(nip)) return
  taken.add(emailKantor.trim().toLowerCase())
  ACCOUNTS.push({ nip, nama, emailKantor: emailKantor.trim().toLowerCase(), peran: [], status: 'Aktif', wajibGantiSandi: true, gagalBerturut: 0, kataSandi: DEMO_PASSWORD })
}

/** Akun demo yang tampil di halaman Masuk. */
export const DEMO_ACCOUNT_NIPS = ['PPI-2016-0322', 'PPI-2016-0323', 'PPI-2016-0003', 'PPI-2019-0007', 'PPI-2020-0031', 'PPI-2017-0009', 'PPI-2024-0076', 'PPI-2017-0012', 'PPI-2018-0013', 'PPI-2024-0058', 'PPI-2024-0112', 'PPI-2015-0326', 'PPI-2025-0019']

import { EXITED } from '@/data/profiles'
import { ROSTER } from '@/data/employees'
import { logSecurity } from '@/data/audit-log'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { ROLE_ORDER } from '@/lib/access'
import { DEMO_MODE, simLabel } from '@/lib/demo'
import { DEMO_TODAY } from '@/lib/today'
import { formatDate } from '@/lib/format'
import { ROLE_LABEL, type CurrentUser, type Role } from '@/data/users'

/*
 * SIMULASI tanpa backend. Kata sandi dibandingkan apa adanya di memori dan kode OTP ditampilkan di toast.
 * Backend WAJIB menyimpan kata sandi sebagai hash (argon2/bcrypt + salt), mengirim OTP sungguhan lewat email,
 * membatasi laju percobaan di server, dan tidak pernah mengembalikan OTP/token reset ke klien.
 */

export type AccountStatus = 'Aktif' | 'Terkunci' | 'Nonaktif' | 'Ditangguhkan'
export type KsbRole = 'sekretaris' | 'bendahara' | 'ketua'
export type Masa = { mulai: string; selesai: string }
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
  /** Masa jabatan pengurus KSB per jabatan; peran koperasi hilang otomatis di luar masa jabatan. */
  masaJabatan?: Partial<Record<KsbRole, Masa>>
  nonaktifSejak?: string
  alasanTangguh?: string
  /** false = bukan pegawai (akun Presentasi): tanpa NIP, tidak bisa mengajukan apa pun. */
  pegawai?: boolean
  presentasi?: boolean
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
const TERM = { mulai: '2025-01-01', selesai: '2027-12-31' }
const DEMO_ROLES: Record<string, { peran: Role[]; masaJabatan?: Account['masaJabatan']; wajibGantiSandi?: boolean }> = {
  'PPI-2016-0322': { peran: ['hr_recruitment'] }, // Okta Maulana
  'PPI-2016-0323': { peran: ['hr_personalia', 'hr_development'] }, // Teddy Syahputra (multi-peran)
  'PPI-2015-0326': { peran: ['hr_recruitment'], wajibGantiSandi: true }, // Wawan Kurniawan (login pertama)
  'PPI-2016-0003': { peran: ['manager'] }, // Lestari Wulandari
  'PPI-2020-0031': { peran: ['payroll'] }, // Mira Andriani
  'PPI-2017-0009': { peran: ['finance'] }, // Yohanes Kristanto
  'PPI-2024-0076': { peran: ['sekretaris'], masaJabatan: { sekretaris: TERM } }, // Ratna Dewi
  'PPI-2017-0012': { peran: ['bendahara'], masaJabatan: { bendahara: TERM } }, // Nina Marlina
  'PPI-2018-0013': { peran: ['ketua'], masaJabatan: { ketua: TERM } }, // Rudi Hartanto
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

// Direktur Utama (bukan bagian dari 248 pegawai di roster; atasan Lestari lewat id 'direksi').
ACCOUNTS.push({ nip: 'DIR-0001', nama: 'Benny Tjandra', emailKantor: emailFor('Benny Tjandra', taken), peran: ['direksi'], status: 'Aktif', wajibGantiSandi: false, gagalBerturut: 0, kataSandi: DEMO_PASSWORD, pegawai: false })
// Akun Presentasi (demo): bukan pegawai, tanpa NIP dan OTP; memilih perspektif akun demo lain.
ACCOUNTS.push({ nip: 'PRESENTASI', nama: 'Presentasi (demo)', emailKantor: `presentasi@${SECURITY_POLICY.domain}`, peran: [], status: 'Aktif', wajibGantiSandi: false, gagalBerturut: 0, kataSandi: DEMO_PASSWORD, pegawai: false, presentasi: true })
taken.add(`presentasi@${SECURITY_POLICY.domain}`)

const byEmail = (email: string) => ACCOUNTS.find((a) => a.emailKantor === email.trim().toLowerCase() && (DEMO_MODE || !a.presentasi))
export const accountOf = (nip: string) => ACCOUNTS.find((a) => a.nip === nip)
export const emailTakenBy = (email: string, exceptNip?: string) => ACCOUNTS.find((a) => a.emailKantor === email.trim().toLowerCase() && a.nip !== exceptNip)

const supervisors = new Set(ROSTER.map((e) => e.atasanId))
const inMasa = (m: Masa) => m.mulai <= DEMO_TODAY && DEMO_TODAY <= m.selesai
/** Peran web akun: peran tetapan + Atasan otomatis (punya bawahan langsung), diurutkan menurut matriks. */
export function rolesOf(a: Account, ignoreStatus = false): Role[] {
  if (!ignoreStatus && a.status !== 'Aktif' && a.status !== 'Terkunci') return []
  // Peran koperasi hanya berlaku dalam masa jabatan.
  const r = new Set<Role>(a.peran.filter((x) => !a.masaJabatan?.[x as KsbRole] || inMasa(a.masaJabatan[x as KsbRole]!)))
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
  | { ok: true; account: Account; roles: Role[]; otp: boolean; mustChange: boolean; presentasi?: boolean }
  | { ok: false; kind: 'salah'; sisa?: number; message: string }
  | { ok: false; kind: 'terkunci' | 'nonaktif' | 'mobile' | 'ditangguhkan'; message: string }

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
  if (a.status === 'Ditangguhkan') {
    logSecurity({ event: 'login-gagal', email, nip: a.nip, detail: 'Akses ditangguhkan' })
    return { ok: false, kind: 'ditangguhkan', message: 'Akses Anda ditangguhkan. Hubungi IT.' }
  }
  if (a.presentasi) {
    a.gagalBerturut = 0
    logSecurity({ event: 'login-berhasil', email, nip: a.nip, pengguna: a.nama, detail: 'Login akun Presentasi (demo)' })
    return { ok: true, account: a, roles: [], otp: false, mustChange: false, presentasi: true }
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
  if (a.presentasi) return
  logSecurity({ event: 'login-berhasil', email: a.emailKantor, nip: a.nip, pengguna: a.nama, detail: 'Login berhasil' })
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
export const DEMO_ACCOUNT_NIPS = ['PRESENTASI', 'DIR-0001', 'PPI-2016-0322', 'PPI-2016-0323', 'PPI-2016-0003', 'PPI-2019-0007', 'PPI-2020-0031', 'PPI-2017-0009', 'PPI-2024-0076', 'PPI-2017-0012', 'PPI-2018-0013', 'PPI-2024-0058', 'PPI-2024-0112', 'PPI-2015-0326', 'PPI-2025-0019']


// =====================================================================================
// Administrasi akun (Pengaturan Sistem). Semua aksi tercatat di audit log.
// =====================================================================================
export const ASSIGNABLE: Role[] = ['hr_recruitment', 'hr_personalia', 'hr_development', 'manager', 'direksi', 'payroll', 'finance', 'sekretaris', 'bendahara', 'ketua', 'superadmin']
export const KSB_ROLES: KsbRole[] = ['sekretaris', 'bendahara', 'ketua']
export const isKsb = (r: Role): r is KsbRole => (KSB_ROLES as Role[]).includes(r)
const wibFmt = (t: number) => wibClock(t)
export const lockInfo = (a: Account) => (a.status === 'Terkunci' && a.terkunciSampai ? wibFmt(a.terkunciSampai) : '')

/** Akun yang tampil di daftar pengguna (tanpa akun Presentasi). */
export const listAccounts = () => ACCOUNTS.filter((a) => !a.presentasi)

/** Status tampilan: Terkunci yang sudah lewat waktunya dianggap Aktif. */
export function statusOf(a: Account): AccountStatus {
  if (a.status === 'Terkunci' && a.terkunciSampai && a.terkunciSampai <= Date.now()) return 'Aktif'
  return a.status
}

export function resetPasswordAdmin(target: Account, by: Account) {
  target.wajibGantiSandi = true
  logSecurity({ event: 'reset-sandi-admin', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: `Reset kata sandi ${target.nama} (${target.emailKantor}); wajib ganti sandi saat login berikutnya` })
  return `${simLabel}Tautan reset dikirim ke ${target.emailKantor}`
}
export function unlockAccount(target: Account, by: Account) {
  target.status = 'Aktif'; target.gagalBerturut = 0; target.terkunciSampai = undefined
  logSecurity({ event: 'akun-dibuka-kunci', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: `Kunci akun ${target.nama} dibuka` })
}
export function suspendAccount(target: Account, alasan: string, by: Account): { error?: string } {
  if (target.nip === by.nip) return { error: 'Anda tidak dapat menangguhkan akun sendiri' }
  if (alasan.trim().length < 10) return { error: 'Alasan minimal 10 karakter' }
  if (target.peran.includes('superadmin') && !ACCOUNTS.some((x) => x !== target && x.status === 'Aktif' && x.peran.includes('superadmin'))) return { error: 'Minimal harus ada 1 Super Admin aktif' }
  target.status = 'Ditangguhkan'; target.alasanTangguh = alasan.trim()
  logSecurity({ event: 'akun-ditangguhkan', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: `Akses ${target.nama} ditangguhkan: ${alasan.trim()}` })
  return {}
}
export function restoreAccount(target: Account, alasan: string, by: Account): { error?: string } {
  if (alasan.trim().length < 10) return { error: 'Alasan minimal 10 karakter' }
  target.status = 'Aktif'; target.alasanTangguh = undefined; target.gagalBerturut = 0
  logSecurity({ event: 'akses-dipulihkan', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: `Akses ${target.nama} dipulihkan: ${alasan.trim()}` })
  return {}
}

export type RoleDraft = { roles: Role[]; masa: Partial<Record<KsbRole, Masa>> }
/** Validasi perubahan peran. Mengembalikan galat umum dan galat per-peran KSB. */
export function validateRoles(target: Account, d: RoleDraft, by: Account): { error?: string; ksb: Partial<Record<KsbRole, string>> } {
  const ksb: Partial<Record<KsbRole, string>> = {}
  for (const r of KSB_ROLES) {
    if (!d.roles.includes(r)) continue
    const m = d.masa[r]
    if (!m?.mulai || !m?.selesai) { ksb[r] = 'Masa jabatan wajib diisi'; continue }
    if (m.selesai < m.mulai) { ksb[r] = 'Tanggal selesai harus setelah tanggal mulai'; continue }
    const other = ACCOUNTS.find((x) => x !== target && x.peran.includes(r) && x.masaJabatan?.[r] && x.masaJabatan[r]!.mulai <= m.selesai && m.mulai <= x.masaJabatan[r]!.selesai)
    if (other) ksb[r] = `${ROLE_LABEL[r].replace(' KSB', '')} aktif: ${other.nama} s/d ${formatDate(other.masaJabatan![r]!.selesai)}. Akhiri dulu masa jabatannya.`
  }
  let error: string | undefined
  if (target.nip === by.nip) error = 'Peran Anda sendiri harus diubah Super Admin lain'
  else if (target.peran.includes('superadmin') && !d.roles.includes('superadmin') && !ACCOUNTS.some((x) => x !== target && x.status !== 'Nonaktif' && x.peran.includes('superadmin'))) error = 'Minimal harus ada 1 Super Admin aktif'
  return { error, ksb }
}
export function changeRoles(target: Account, d: RoleDraft, by: Account): { error?: string } {
  const v = validateRoles(target, d, by)
  if (v.error || Object.keys(v.ksb).length) return { error: v.error ?? Object.values(v.ksb)[0] }
  const before = new Set(target.peran), after = new Set(d.roles)
  const plus = d.roles.filter((r) => !before.has(r)).map((r) => ROLE_LABEL[r])
  const minus = target.peran.filter((r) => !after.has(r)).map((r) => ROLE_LABEL[r])
  target.peran = ROLE_ORDER.filter((r) => after.has(r))
  target.masaJabatan = Object.fromEntries(KSB_ROLES.filter((r) => after.has(r)).map((r) => [r, d.masa[r]!]))
  const parts = [...plus.map((p) => `+${p}`), ...minus.map((m) => `−${m}`)]
  logSecurity({ event: 'perubahan-peran', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: `Perubahan peran ${target.nama}: ${parts.length ? parts.join(', ') : 'masa jabatan diperbarui'} oleh ${by.nama}` })
  return {}
}

export type PolicyKey = 'domain' | 'minPassword' | 'maxFailed' | 'lockMinutes' | 'idleMinutes' | 'idleWarnMinutes' | 'otpRoles'
export function applyPolicy(next: Pick<typeof SECURITY_POLICY, PolicyKey>, by: Account) {
  const diffs: string[] = []
  for (const k of Object.keys(next) as PolicyKey[]) {
    const a = String(Array.isArray(SECURITY_POLICY[k]) ? (SECURITY_POLICY[k] as Role[]).map((r) => ROLE_LABEL[r]).join(', ') : SECURITY_POLICY[k])
    const b = String(Array.isArray(next[k]) ? (next[k] as Role[]).map((r) => ROLE_LABEL[r]).join(', ') : next[k])
    if (a !== b) diffs.push(`${POLICY_LABEL[k]}: ${a} → ${b}`)
  }
  Object.assign(SECURITY_POLICY, next)
  if (diffs.length) logSecurity({ event: 'kebijakan-diubah', email: by.emailKantor, nip: by.nip, pengguna: by.nama, detail: diffs.join('; ') })
  return diffs.length
}
export const POLICY_LABEL: Record<PolicyKey, string> = {
  domain: 'Domain email', minPassword: 'Panjang minimal kata sandi', maxFailed: 'Gagal maksimal', lockMinutes: 'Lama terkunci (menit)',
  idleMinutes: 'Idle (menit)', idleWarnMinutes: 'Peringatan sebelum habis (menit)', otpRoles: 'Peran wajib OTP',
}

// =====================================================================================
// Seed audit log 7 hari terakhir (19–26 Okt 2026), deterministik.
// =====================================================================================
;(function seedAudit() {
  const em = (nip: string) => accountOf(nip)!
  const iso = (d: number, hm: string) => `2026-10-${String(d).padStart(2, '0')}T${hm}:00+07:00`
  const ev = (d: number, hm: string, event: Parameters<typeof logSecurity>[0]['event'], nip: string, detail: string, extra: Partial<Parameters<typeof logSecurity>[0]> = {}) => {
    const a = em(nip)
    logSecurity({ at: iso(d, hm), event, email: a.emailKantor, nip: a.nip, pengguna: a.nama, detail, ...extra })
    if (event === 'login-berhasil' && (!a.loginTerakhir || a.loginTerakhir < iso(d, hm))) a.loginTerakhir = iso(d, hm)
  }
  const OKTA = 'PPI-2016-0322', TEDDY = 'PPI-2016-0323', LES = 'PPI-2016-0003', HEN = 'PPI-2019-0007', MIRA = 'PPI-2020-0031', YOH = 'PPI-2017-0009', RAT = 'PPI-2024-0076', NINA = 'PPI-2017-0012', RUDI = 'PPI-2018-0013', TAU = 'PPI-2024-0058', WAWAN = 'PPI-2015-0326'
  // Senin–Minggu: login rutin
  const days: [number, string, string][] = [[19, '07.52', OKTA], [19, '08.10', TEDDY], [19, '08.31', HEN], [19, '09.02', MIRA], [20, '07.48', OKTA], [20, '08.05', TEDDY], [20, '08.40', LES], [20, '09.15', YOH], [21, '07.55', HEN], [21, '08.20', MIRA], [21, '08.45', RAT], [21, '10.30', TAU], [22, '07.50', OKTA], [22, '08.12', TEDDY], [23, '08.00', HEN], [23, '08.18', LES], [23, '09.05', NINA], [24, '07.58', MIRA], [24, '08.25', RUDI], [26, '07.45', OKTA], [26, '07.59', TEDDY], [26, '08.30', TAU]]
  for (const [d, hm, nip] of days) {
    const hm24 = hm.replace('.', ':')
    ev(d, hm24, 'login-berhasil', nip, 'Login berhasil')
    if (needsOtp(rolesOf(em(nip)))) ev(d, hm24.replace(/:(\d\d)$/, (_, m) => ':' + String(Math.min(59, +m + 1)).padStart(2, '0')), 'otp-berhasil', nip, 'OTP benar')
  }
  // Hendra terkunci 1x (22 Okt) lalu dibuka kuncinya oleh Taufik
  for (let i = 1; i <= 5; i++) ev(22, `13:${String(10 + i).padStart(2, '0')}`, 'login-gagal', HEN, i === 5 ? 'Kata sandi salah' : `Kata sandi salah; sisa ${5 - i} percobaan`)
  ev(22, '13:15', 'akun-terkunci', HEN, '5 kali gagal berturut-turut; dikunci 15 menit')
  ev(22, '13:40', 'akun-dibuka-kunci', TAU, `Kunci akun ${em(HEN).nama} dibuka`)
  ev(22, '13:42', 'login-berhasil', HEN, 'Login berhasil')
  // Login gagal lain
  logSecurity({ at: iso(21, '22:14'), event: 'login-gagal', email: 'admin@primaplast.co.id', detail: 'Email tidak terdaftar', pengguna: 'Tidak dikenal' })
  logSecurity({ at: iso(24, '03:27'), event: 'login-gagal', email: 'hr@primaplast.co.id', detail: 'Email tidak terdaftar', pengguna: 'Tidak dikenal' })
  ev(20, '08:41', 'otp-gagal', LES, 'Kode salah (1/3)')
  // Teddy ganti peran aktif
  ev(20, '10:05', 'ganti-peran-aktif', TEDDY, 'HR Personalia → HR Development & Industrial', { peran: 'hr_development' })
  ev(20, '14:30', 'ganti-peran-aktif', TEDDY, 'HR Development & Industrial → HR Personalia', { peran: 'hr_personalia' })
  ev(23, '11:12', 'ganti-peran-aktif', TEDDY, 'HR Personalia → HR Development & Industrial', { peran: 'hr_development' })
  // Reset kata sandi Wawan oleh Taufik; perubahan peran Okta oleh Taufik
  ev(21, '10:35', 'reset-sandi-admin', TAU, `Reset kata sandi ${em(WAWAN).nama} (${em(WAWAN).emailKantor}); wajib ganti sandi saat login berikutnya`)
  ev(21, '10:52', 'perubahan-peran', TAU, `Perubahan peran ${em(OKTA).nama}: +HR Recruitment oleh ${em(TAU).nama}`)
  // Sesi habis x2, logout
  ev(23, '15:20', 'sesi-habis', MIRA, 'Sesi berakhir karena tidak aktif')
  ev(25, '11:05', 'sesi-habis', OKTA, 'Sesi berakhir karena tidak aktif')
  ev(19, '17:02', 'logout', OKTA, 'Keluar dari aplikasi')
  ev(21, '17:10', 'logout', HEN, 'Keluar dari aplikasi')
  ev(24, '16:45', 'logout', RUDI, 'Keluar dari aplikasi')
  ev(26, '09:15', 'ganti-kata-sandi', YOH, 'Kata sandi diganti')
})()

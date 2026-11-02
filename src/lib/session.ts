import { useSyncExternalStore } from 'react'
import { accountOf, completeLogin, rolesOf, userOf, type Account } from '@/data/accounts'
import { logSecurity, setPresenter } from '@/data/audit-log'
import { ROLE_LABEL, type CurrentUser, type Role } from '@/data/users'

/*
 * Sesi web (simulasi). Disimpan di sessionStorage: reload tetap masuk, tab baru harus login lagi.
 * Backend memakai cookie sesi HttpOnly + rotasi token; jangan menyimpan kredensial di storage.
 */
const KEY = 'kompeten-session'
/** nip: akun yang login. viewAs: (Mode Presentasi) akun yang sedang "dilihat". */
type Stored = { nip: string; role?: Role; viewAs?: string }

const read = (): Stored | null => {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}
const write = (s: Stored | null) => {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* storage tidak tersedia */
  }
}
const lastRole = (nip: string): Role | null => {
  try { return (localStorage.getItem(`kompeten-role:${nip}`) as Role | null) } catch { return null }
}
const rememberRole = (nip: string, role: Role) => {
  try { localStorage.setItem(`kompeten-role:${nip}`, role) } catch { /* abaikan */ }
}

let current: Stored | null = read()
/** Peran yang berlaku untuk sesi ini; perubahan peran oleh Super Admin berlaku pada login atau ganti peran berikutnya. */
let snapshot: Role[] | null = null
let version = 0
let endNotice: 'idle' | 'logout' | null = null
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f) }

export type Session = {
  account: Account
  roles: Role[]
  role: Role
  user: CurrentUser
  /** Mode Presentasi: akun Presentasi sebagai tuan rumah; `viewing` = sudah memilih perspektif. */
  presentasi?: { host: Account; viewing: boolean }
}

const defaultRole = (roles: Role[], nip: string): Role => {
  const remembered = lastRole(nip)
  // Peran tetapan pertama menurut urutan matriks; Atasan otomatis hanya bila akun tidak punya peran tetapan.
  const assigned = roles.filter((r) => r !== 'supervisor')
  return remembered && roles.includes(remembered) ? remembered : (assigned[0] ?? roles[0])
}

function resolve(): Session | null {
  if (!current) return null
  const host = accountOf(current.nip)
  if (!host || host.status === 'Nonaktif' || host.status === 'Ditangguhkan') return null
  if (host.presentasi) {
    const target = current.viewAs ? accountOf(current.viewAs) : undefined
    if (!target) return { account: host, roles: [], role: 'superadmin', user: { role: 'superadmin', nama: host.nama, jabatan: 'Presentasi', initials: 'PR' }, presentasi: { host, viewing: false } }
    const roles = snapshot ?? rolesOf(target)
    if (!roles.length) return null
    const role = current.role && roles.includes(current.role) ? current.role : defaultRole(roles, target.nip)
    return { account: target, roles, role, user: userOf(target, role), presentasi: { host, viewing: true } }
  }
  const roles = snapshot ?? rolesOf(host)
  if (roles.length === 0) return null
  const role = current.role && roles.includes(current.role) ? current.role : defaultRole(roles, host.nip)
  return { account: host, roles, role, user: userOf(host, role) }
}

let cache: { v: number; s: Session | null } | null = null
export function getSession(): Session | null {
  if (!cache || cache.v !== version) cache = { v: version, s: resolve() }
  return cache.s
}
export const useSession = () => {
  useSyncExternalStore(subscribe, () => version)
  return getSession()
}

// Audit: aksi dalam mode presentasi tercatat sebagai "Presentasi (sebagai …)".
setPresenter(() => {
  const s = getSession()
  return s?.presentasi ? (s.presentasi.viewing ? `Presentasi (sebagai ${s.account.nama})` : 'Presentasi (demo)') : undefined
})

export function startSession(account: Account) {
  completeLogin(account)
  if (account.presentasi) {
    current = { nip: account.nip }
    snapshot = null
  } else {
    snapshot = rolesOf(account)
    current = { nip: account.nip, role: defaultRole(snapshot, account.nip) }
  }
  write(current)
  endNotice = null
  bump()
}

export function switchRole(role: Role) {
  const s = getSession()
  if (!s || !s.roles.includes(role) || s.role === role) return
  logSecurity({ event: 'ganti-peran-aktif', email: s.account.emailKantor, nip: s.account.nip, pengguna: s.account.nama, peran: role, detail: `${ROLE_LABEL[s.role]} → ${ROLE_LABEL[role]}` })
  snapshot = rolesOf(s.account).includes(role) ? rolesOf(s.account) : s.roles
  current = { ...current!, nip: current!.nip, role }
  rememberRole(s.account.nip, role)
  write(current)
  bump()
}

/** Mode Presentasi: lihat sebagai akun demo tertentu (tanpa OTP). */
export function presentAs(nip: string) {
  const target = accountOf(nip)
  if (!current || !target) return
  const roles = rolesOf(target)
  if (!roles.length) return
  snapshot = roles
  current = { nip: current.nip, viewAs: nip, role: defaultRole(roles, nip) }
  write(current)
  logSecurity({ event: 'presentasi-perspektif', email: accountOf(current.nip)!.emailKantor, nip: current.nip, detail: `Melihat sebagai ${target.nama} (${ROLE_LABEL[current.role!]})` })
  bump()
}
export function leavePerspective() {
  if (!current) return
  current = { nip: current.nip }
  snapshot = null
  write(current)
  bump()
}

export function endSession(reason: 'logout' | 'idle') {
  const s = getSession()
  if (s) logSecurity({ event: reason === 'idle' ? 'sesi-habis' : 'logout', email: (s.presentasi?.host ?? s.account).emailKantor, nip: (s.presentasi?.host ?? s.account).nip, pengguna: s.presentasi ? undefined : s.account.nama, peran: s.role, detail: reason === 'idle' ? 'Sesi berakhir karena tidak aktif' : 'Keluar dari aplikasi' })
  current = null
  snapshot = null
  write(null)
  endNotice = reason
  bump()
}
export const takeEndNotice = () => { const n = endNotice; endNotice = null; return n }

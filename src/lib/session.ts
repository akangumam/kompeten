import { useSyncExternalStore } from 'react'
import { accountOf, completeLogin, rolesOf, userOf, type Account } from '@/data/accounts'
import { logSecurity } from '@/data/audit-log'
import { ROLE_LABEL, type CurrentUser, type Role } from '@/data/users'

/*
 * Sesi web (simulasi). Disimpan di sessionStorage: reload tetap masuk, tab baru harus login lagi.
 * Backend memakai cookie sesi HttpOnly + rotasi token; jangan menyimpan kredensial di storage.
 */
const KEY = 'kompeten-session'
type Stored = { nip: string; role: Role }

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
let version = 0
let endNotice: 'idle' | 'logout' | null = null
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f) }

export type Session = { account: Account; roles: Role[]; role: Role; user: CurrentUser }

function resolve(): Session | null {
  if (!current) return null
  const account = accountOf(current.nip)
  if (!account) return null
  const roles = rolesOf(account)
  if (roles.length === 0 || account.status === 'Nonaktif') return null
  const role = roles.includes(current.role) ? current.role : roles[0]
  return { account, roles, role, user: userOf(account, role) }
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

/** Peran aktif awal: peran terakhir yang dipakai akun ini, atau peran pertama menurut urutan matriks. */
export function startSession(account: Account) {
  const roles = rolesOf(account)
  const remembered = lastRole(account.nip)
  // Default: peran tetapan pertama menurut urutan matriks; Atasan otomatis hanya bila akun tidak punya peran tetapan.
  const assigned = roles.filter((r) => r !== 'supervisor')
  const role = remembered && roles.includes(remembered) ? remembered : (assigned[0] ?? roles[0])
  completeLogin(account)
  current = { nip: account.nip, role }
  write(current)
  endNotice = null
  bump()
}

export function switchRole(role: Role) {
  const s = getSession()
  if (!s || !s.roles.includes(role) || s.role === role) return
  logSecurity({ event: 'ganti-peran-aktif', email: s.account.emailKantor, nip: s.account.nip, peran: role, detail: `${ROLE_LABEL[s.role]} → ${ROLE_LABEL[role]}` })
  current = { nip: s.account.nip, role }
  rememberRole(s.account.nip, role)
  write(current)
  bump()
}

export function endSession(reason: 'logout' | 'idle') {
  const s = getSession()
  if (s) logSecurity({ event: reason === 'idle' ? 'sesi-habis' : 'logout', email: s.account.emailKantor, nip: s.account.nip, peran: s.role, detail: reason === 'idle' ? 'Sesi berakhir karena tidak aktif' : 'Keluar dari aplikasi' })
  current = null
  write(null)
  endNotice = reason
  bump()
}
export const takeEndNotice = () => { const n = endNotice; endNotice = null; return n }

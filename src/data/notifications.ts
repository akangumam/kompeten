import { useSyncExternalStore } from 'react'
import type { PageId } from '@/App'
import type { Role } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

export type Notif = { id: string; to: Role; title: string; body: string; at: string; page: PageId; read: boolean }
export const NOTIFS: Notif[] = []

let version = 0
const subs = new Set<() => void>()
export const useNotifs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)
const bump = () => { version++; subs.forEach((f) => f()) }

let seq = 0
export function notify(n: Omit<Notif, 'id' | 'at' | 'read'>) {
  NOTIFS.unshift({ ...n, id: `N-${++seq}`, at: formatDate(DEMO_TODAY), read: false })
  bump()
}
export const notifsFor = (role: Role) => NOTIFS.filter((n) => n.to === role)
export const unreadOf = (role: Role) => NOTIFS.filter((n) => n.to === role && !n.read).length
export function markRead(role: Role) {
  NOTIFS.filter((n) => n.to === role).forEach((n) => { n.read = true })
  bump()
}

import { DEMO_TODAY } from '@/lib/today'
import { bump } from '@/data/recruitment/store'

export type PortalAccount = {
  id: 'maya' | 'dewi'
  email: string
  nama: string
  phone: string
  candidateIds: string[]
  deleteRequest?: { tanggal: string }
}

export type PortalSession = {
  accountId: string
  email: string
  nama: string
  phone: string
} | null

export const PORTAL_ACCOUNTS: PortalAccount[] = [
  { id: 'maya', email: 'maya.sari@email.com', nama: 'Maya Sari', phone: '0821-7710-3346', candidateIds: ['LMR-2026-0150'] },
  { id: 'dewi', email: 'dewi.lestari@email.com', nama: 'Dewi Lestari', phone: '0819-6633-2051', candidateIds: ['LMR-2026-0146'] },
]

export const accountByEmail = (email: string) => PORTAL_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
export const accountById = (id: string) => PORTAL_ACCOUNTS.find((a) => a.id === id)

export const sessionFor = (persona: 'maya' | 'dewi'): PortalSession => {
  const a = accountById(persona)
  if (!a) return null
  return { accountId: a.id, email: a.email, nama: a.nama, phone: a.phone }
}

export function addCandidateToAccount(accountId: string, candId: string) {
  const a = PORTAL_ACCOUNTS.find((x) => x.id === accountId)
  if (a && !a.candidateIds.includes(candId)) a.candidateIds.push(candId)
}

export function requestDeletion(accountId: string) {
  const a = PORTAL_ACCOUNTS.find((x) => x.id === accountId)
  if (a) { a.deleteRequest = { tanggal: DEMO_TODAY }; bump() }
}

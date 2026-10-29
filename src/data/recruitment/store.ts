import { useSyncExternalStore } from 'react'

/** Satu versi untuk seluruh data rekrutmen (kandidat, lowongan, tes, penawaran); halaman berlangganan lewat useRecruitment. */
let version = 0
const subs = new Set<() => void>()
export const bump = () => {
  version++
  subs.forEach((f) => f())
}
export const useRecruitment = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )

import { useSyncExternalStore } from 'react'

let version = 0
const subs = new Set<() => void>()

/** Beri tahu komponen bahwa data Koperasi (modul-level, mutable) berubah. */
export const bump = () => {
  version++
  subs.forEach((f) => f())
}

export const useKoperasi = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )

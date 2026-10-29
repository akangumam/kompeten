import { useSyncExternalStore } from 'react'

let version = 0
const subs = new Set<() => void>()

export const bump = () => {
  version++
  subs.forEach((f) => f())
}

export const useMaster = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )

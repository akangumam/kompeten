import { useCallback, useState } from 'react'
import { nowStamp } from '@/data/attendance'
import { atasanOf, ROSTER } from '@/data/employees'
import { pendingStatusFor } from '@/data/leave'
import { SEED_SWAPS, type ShiftSwap, type WorkShift } from '@/data/shift-swaps'
import type { CurrentUser } from '@/data/users'

export type NewSwap = { date: string; nikA: string; nikB: string; shiftA: WorkShift; shiftB: WorkShift; alasan: string }

export function useShiftSwaps() {
  const [swaps, setSwaps] = useState<ShiftSwap[]>(SEED_SWAPS)

  const submit = useCallback(
    (input: NewSwap, actor: CurrentUser) => {
      const no = `TKS-2026-${String(42 + swaps.length - SEED_SWAPS.length).padStart(4, '0')}`
      const swap: ShiftSwap = { ...input, no, status: pendingStatusFor(input.nikA), by: actor.nama, at: nowStamp() }
      setSwaps((s) => [swap, ...s])
      return swap
    },
    [swaps.length],
  )

  const decide = useCallback((no: string, actor: CurrentUser, status: 'disetujui' | 'ditolak' | 'dibatalkan', alasan?: string) => {
    setSwaps((ss) =>
      ss.map((s) => {
        if (s.no !== no) return s
        const emp = ROSTER.find((e) => e.nik === s.nikA)
        const proxy = actor.role === 'manager' && status !== 'dibatalkan' && emp && emp.atasanId !== 'manager'
        const by = proxy ? `${actor.nama} (mewakili ${atasanOf(emp).nama})` : actor.nama
        return { ...s, status, decision: { by, at: nowStamp(), alasan } }
      }),
    )
  }, [])

  return {
    swaps,
    submit,
    approve: (no: string, actor: CurrentUser) => decide(no, actor, 'disetujui'),
    reject: (no: string, actor: CurrentUser, alasan: string) => decide(no, actor, 'ditolak', alasan),
    cancel: (no: string, actor: CurrentUser, alasan: string) => decide(no, actor, 'dibatalkan', alasan),
  }
}
export type SwapApi = ReturnType<typeof useShiftSwaps>

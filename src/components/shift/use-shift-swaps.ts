import { useCallback, useState } from 'react'
import { nowStamp } from '@/data/attendance'
import { atasanOf, ROSTER } from '@/data/employees'
import { notify } from '@/data/notifications'
import { pendingStatusFor } from '@/data/leave'
import { SEED_SWAPS, type ShiftSwap, type SwapConfirm, type WorkShift } from '@/data/shift-swaps'
import type { CurrentUser } from '@/data/users'
import { auditPresentasi } from '@/lib/presentation-audit'

export type NewSwap = { date: string; nikA: string; nikB: string; shiftA: WorkShift; shiftB: WorkShift; alasan: string }

const nameOf = (nik: string) => ROSTER.find((e) => e.nik === nik)?.nama ?? nik
/** Pegawai yang belum menjawab "setuju". */
export const pendingConfirm = (s: ShiftSwap) => [s.nikA, s.nikB].filter((n) => s.konfirmasi[n]?.status !== 'setuju')

export function useShiftSwaps() {
  const [swaps, setSwaps] = useState<ShiftSwap[]>(SEED_SWAPS)

  /** Pengajuan HR Personalia: kedua pegawai harus mengonfirmasi dulu (status Menunggu Konfirmasi). */
  const submit = useCallback(
    (input: NewSwap, actor: CurrentUser) => {
      const no = `TKS-2026-${String(Math.max(...swaps.map((s) => Number(s.no.slice(-4)))) + 1).padStart(4, '0')}`
      const swap: ShiftSwap = {
        ...input,
        no,
        status: 'menunggu-konfirmasi',
        by: actor.nama,
        at: nowStamp(),
        diajukanOleh: 'hr',
        konfirmasi: { [input.nikA]: { status: 'menunggu' }, [input.nikB]: { status: 'menunggu' } },
      }
      setSwaps((s) => [swap, ...s])
      return swap
    },
    [swaps],
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

  /** Konfirmasi pegawai (aplikasi atau dicatat HR). Semua setuju → Menunggu Approval Atasan; ada yang menolak → Ditolak. */
  const confirm = useCallback(
    (no: string, nik: string, setuju: boolean, via: 'aplikasi' | 'dicatat-hr', actor: CurrentUser, keterangan?: string) => {
      const s = swaps.find((x) => x.no === no)
      if (!s || s.status !== 'menunggu-konfirmasi') return
      const at = nowStamp()
      auditPresentasi(`${setuju ? 'Mencatat konfirmasi' : 'Mencatat penolakan'} tukar shift ${no} (${nameOf(nik)})`)
      const c: SwapConfirm = { status: setuju ? 'setuju' : 'menolak', at, via, oleh: via === 'dicatat-hr' ? actor.nama : undefined, keterangan }
      const konfirmasi = { ...s.konfirmasi, [nik]: c }
      let next: ShiftSwap = { ...s, konfirmasi }
      if (!setuju) next = { ...next, status: 'ditolak', decision: { by: `${nameOf(nik)} (konfirmasi pegawai)`, at, alasan: keterangan } }
      else if ([s.nikA, s.nikB].every((n) => konfirmasi[n]?.status === 'setuju')) {
        notify({ to: 'supervisor', title: 'Tukar shift menunggu approval', body: `${s.no}: ${nameOf(s.nikA)} ↔ ${nameOf(s.nikB)} sudah dikonfirmasi kedua pegawai.`, page: 'shift-swap' })
        next = { ...next, status: pendingStatusFor(s.nikA) }
      }
      setSwaps((ss) => ss.map((x) => (x.no === no ? next : x)))
    },
    [swaps],
  )

  return {
    swaps,
    submit,
    confirm,
    approve: (no: string, actor: CurrentUser) => { auditPresentasi(`Menyetujui tukar shift ${no} (${actor.nama})`); return decide(no, actor, 'disetujui') },
    reject: (no: string, actor: CurrentUser, alasan: string) => decide(no, actor, 'ditolak', alasan),
    cancel: (no: string, actor: CurrentUser, alasan: string) => decide(no, actor, 'dibatalkan', alasan),
  }
}
export type SwapApi = ReturnType<typeof useShiftSwaps>

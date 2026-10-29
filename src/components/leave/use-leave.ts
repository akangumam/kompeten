import { useCallback, useState } from 'react'
import { nowStamp } from '@/data/attendance'
import { NEEDS_HRD, pendingStatusFor, SEED_REQUESTS, syncDayLinks, type Jenis, type LeaveRequest } from '@/data/leave'
import { ROSTER } from '@/data/employees'
import { seededSickCategory } from '@/data/master/sick-categories'
import { chainFor } from '@/data/master/approvers'
import type { CurrentUser } from '@/data/users'

export type NewRequest = {
  nik: string
  jenis: Jenis
  sub?: string
  start: string
  end: string
  hari: number
  alasan: string
  tujuan?: string
  lampiran?: string
  jam?: string
}

const log = (r: LeaveRequest, by: string, action: string) => [...(r.riwayat ?? []), { at: nowStamp(), by, action }]

export function useLeave() {
  const [requests, setRequests] = useState<LeaveRequest[]>(SEED_REQUESTS)
  // Absensi dan Rekap membaca status harian dari pengajuan yang sama.
  syncDayLinks(requests)

  const submit = useCallback(
    (input: NewRequest, actor: CurrentUser) => {
      const no = `CTI-2026-${String(244 + requests.length - SEED_REQUESTS.length).padStart(4, '0')}`
      const req: LeaveRequest = { ...input, no, status: pendingStatusFor(input.nik), by: actor.nama, at: nowStamp() }
      setRequests((r) => [req, ...r])
      return req
    },
    [requests.length],
  )

  const update = useCallback((no: string, fn: (r: LeaveRequest) => LeaveRequest) => setRequests((rs) => rs.map((r) => (r.no === no ? fn(r) : r))), [])
  // Penyetuju yang sedang menunggu (Matriks Penyetuju); HR & GA Manager boleh menyetujui mewakilinya.
  const currentStep = (r: LeaveRequest) => {
    const emp = ROSTER.find((e) => e.nik === r.nik)
    const chain = emp ? chainFor(emp) : []
    return { chain, step: chain[Math.min(r.approvals?.length ?? 0, chain.length - 1)] }
  }
  const proxyBy = (actor: CurrentUser, r: LeaveRequest) => {
    const { step } = currentStep(r)
    return actor.role === 'manager' && step && step.person.id !== 'manager' ? `${actor.nama} (mewakili ${step.person.nama})` : actor.nama
  }

  /** Keputusan Atasan. Sakit dan Dinas lanjut ke verifikasi HRD; pembatalan yang disetujui mengembalikan saldo. */
  const approve = useCallback(
    (no: string, actor: CurrentUser) =>
      update(no, (r) => {
        const by = proxyBy(actor, r)
        if (r.status === 'pembatalan') {
          const back = r.jenis === 'Cuti Tahunan' ? ` Saldo dikembalikan ${r.hari} hari.` : ''
          return {
            ...r,
            status: 'dibatalkan',
            pembatalan: { ...r.pembatalan!, keputusan: { by, at: nowStamp(), hasil: 'disetujui' } },
            riwayat: log(r, by, `Pembatalan disetujui.${back}`),
          }
        }
        // Dua penyetuju: persetujuan pertama meneruskan ke Penyetuju 2; keputusan akhir setelah penyetuju terakhir.
        const { chain } = currentStep(r)
        const done = (r.approvals?.length ?? 0) + 1
        if (done < chain.length) {
          const approvals = [...(r.approvals ?? []), { step: done, by, at: nowStamp() }]
          return { ...r, status: 'menunggu-manager', approvals, riwayat: log(r, by, `Disetujui Penyetuju ${done}, menunggu Penyetuju ${done + 1} (${chain[done].person.nama})`) }
        }
        const approvals = [...(r.approvals ?? []), { step: done, by, at: nowStamp() }]
        const next = NEEDS_HRD.includes(r.jenis) ? 'menunggu-hrd' : 'disetujui'
        return { ...r, approvals, status: next, decision: { by, at: nowStamp() }, riwayat: log(r, by, next === 'menunggu-hrd' ? 'Disetujui Atasan, menunggu verifikasi HRD' : 'Disetujui') }
      }),
    [update],
  )

  const reject = useCallback(
    (no: string, actor: CurrentUser, alasan: string) =>
      update(no, (r) => {
        const by = proxyBy(actor, r)
        if (r.status === 'pembatalan') {
          return { ...r, status: 'disetujui', pembatalan: { ...r.pembatalan!, keputusan: { by, at: nowStamp(), hasil: 'ditolak', alasan } }, riwayat: log(r, by, `Pembatalan ditolak: ${alasan}`) }
        }
        return { ...r, status: 'ditolak', decision: { by, at: nowStamp(), alasan }, riwayat: log(r, by, `Ditolak: ${alasan}`) }
      }),
    [update],
  )

  /** Admin HRD: verifikasi Sakit/Dinas, atau kembalikan dengan alasan (menjadi Ditolak). */
  const verify = useCallback(
    (no: string, actor: CurrentUser, kategori?: string) =>
      update(no, (r) => (r.status !== 'menunggu-hrd' ? r : { ...r, kategori: r.jenis === 'Sakit' ? kategori : r.kategori, status: 'disetujui', verif: { by: actor.nama, at: nowStamp(), hasil: 'disetujui' }, riwayat: log(r, actor.nama, 'Diverifikasi HRD') })),
    [update],
  )
  const giveBack = useCallback(
    (no: string, actor: CurrentUser, alasan: string) =>
      update(no, (r) => (r.status !== 'menunggu-hrd' ? r : { ...r, status: 'ditolak', verif: { by: actor.nama, at: nowStamp(), hasil: 'dikembalikan', alasan }, riwayat: log(r, actor.nama, `Dikembalikan HRD: ${alasan}`) })),
    [update],
  )

  const requestCancel = useCallback(
    (no: string, actor: CurrentUser, alasan: string) =>
      update(no, (r) => (r.status !== 'disetujui' ? r : { ...r, status: 'pembatalan', pembatalan: { by: actor.nama, at: nowStamp(), alasan }, riwayat: log(r, actor.nama, `Pembatalan diajukan: ${alasan}`) })),
    [update],
  )

  /** Skenario demo: verifikasi semua Sakit/Dinas yang menunggu HRD pada rentang tanggal. */
  const verifyAll = useCallback(
    (actor: { nama: string }, from: string, to: string) =>
      setRequests((rs) =>
        rs.map((r) =>
          r.status === 'menunggu-hrd' && r.start >= from && r.start <= to
            ? { ...r, kategori: r.jenis === 'Sakit' ? r.kategori ?? seededSickCategory(r.no) : r.kategori, status: 'disetujui', verif: { by: actor.nama, at: nowStamp(), hasil: 'disetujui' }, riwayat: log(r, actor.nama, 'Diverifikasi HRD (skenario demo)') }
            : r,
        ),
      ),
    [],
  )

  const cancel = useCallback(
    (no: string, actor: CurrentUser, alasan: string) =>
      update(no, (r) => ({ ...r, status: 'dibatalkan', decision: { by: actor.nama, at: nowStamp(), alasan }, riwayat: log(r, actor.nama, `Dibatalkan: ${alasan}`) })),
    [update],
  )

  return { requests, submit, approve, reject, verify, giveBack, requestCancel, verifyAll, cancel }
}
export type LeaveApi = ReturnType<typeof useLeave>

import { useCallback, useState } from 'react'
import { nowStamp } from '@/data/attendance'
import { atasanOf, ROSTER } from '@/data/employees'
import { nextNo, onBehalfOf, SEED_OVERTIME, type OtRecord, type OtUser } from '@/data/overtime'

export type NewSpl = { date: string; niks: string[]; start: string; end: string; pekerjaan: string }

export function useOvertime() {
  const [records, setRecords] = useState<OtRecord[]>(SEED_OVERTIME)

  const create = useCallback(
    (input: NewSpl, actor: OtUser) => {
      const no = nextNo(records)
      const status = actor.role === 'supervisor' ? 'terjadwal' : 'menunggu-approval'
      const at = nowStamp()
      const recs: OtRecord[] = input.niks.map((nik) => ({
        id: `${no}|${nik}`,
        no,
        nik,
        date: input.date,
        start: input.start,
        end: input.end,
        pekerjaan: input.pekerjaan,
        status,
        by: actor.nama,
        byRole: actor.role === 'supervisor' ? 'supervisor' : 'admin',
        at,
      }))
      setRecords((r) => [...recs, ...r])
      return { no, status, approvers: [...new Set(input.niks.map((n) => atasanOf(ROSTER.find((e) => e.nik === n)!).nama))] }
    },
    [records],
  )

  const patch = useCallback((id: string, actor: OtUser, change: Partial<OtRecord>, alasan?: string) => {
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r
        const emp = ROSTER.find((e) => e.nik === r.nik)!
        const proxy = change.status === 'dibatalkan' ? null : onBehalfOf(actor, emp)
        const by = proxy ? `${actor.nama} (mewakili ${proxy})` : actor.nama
        return { ...r, ...change, decision: { by, at: nowStamp(), alasan } }
      }),
    )
  }, [])

  /** Verifikasi HRD: Menunggu Verifikasi HRD → Tervalidasi. Admin boleh menyesuaikan istirahat (jam dibayar dihitung ulang oleh pemanggil). */
  const verify = useCallback((id: string, actor: OtUser, dibayar: number, istirahat: number) => {
    setRecords((rs) => rs.map((r) => (r.id === id && r.status === 'menunggu-verifikasi' ? { ...r, status: 'tervalidasi', dibayar, istirahat, verif: { by: actor.nama, at: nowStamp() } } : r)))
  }, [])

  /** Skenario demo: verifikasi semua lembur yang menunggu HRD pada rentang tanggal. */
  const verifyAll = useCallback((actor: { nama: string }, from: string, to: string) => {
    setRecords((rs) => rs.map((r) => (r.status === 'menunggu-verifikasi' && r.date >= from && r.date <= to ? { ...r, status: 'tervalidasi', verif: { by: actor.nama, at: nowStamp() } } : r)))
  }, [])

  return {
    records,
    create,
    approve: (id: string, actor: OtUser) => patch(id, actor, { status: 'terjadwal' }),
    reject: (id: string, actor: OtUser, alasan: string) => patch(id, actor, { status: 'ditolak' }, alasan),
    /** Validasi Atasan atas realisasi; data berlaku setelah verifikasi HRD. */
    validate: (id: string, actor: OtUser, dibayar: number, kelebihan?: string, istirahat = 0) =>
      patch(id, actor, { status: 'menunggu-verifikasi', dibayar, kelebihan, istirahat }, kelebihan),
    verify,
    verifyAll,
    markTidak: (id: string, actor: OtUser) => patch(id, actor, { status: 'tidak-terealisasi', dibayar: 0 }),
    cancel: (id: string, actor: OtUser, alasan: string) => patch(id, actor, { status: 'dibatalkan' }, alasan),
  }
}
export type OvertimeApi = ReturnType<typeof useOvertime>

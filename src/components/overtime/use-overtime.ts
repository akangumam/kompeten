import { auditPresentasi } from '@/lib/presentation-audit'
import { notify } from '@/data/notifications'
import { useCallback, useState } from 'react'
import { nowStamp } from '@/data/attendance'
import { atasanOf, ROSTER } from '@/data/employees'
import { EXPIRE_REASON, nextNo, onBehalfOf, SEED_OVERTIME, startPassed, type OtRecord, type OtUser } from '@/data/overtime'
import { nowTimeWIB } from '@/lib/today'

export type NewSpl = { date: string; niks: string[]; start: string; end: string; pekerjaan: string }

export function useOvertime() {
  const [records, setRecords] = useState<OtRecord[]>(SEED_OVERTIME)

  const create = useCallback(
    (input: NewSpl, actor: OtUser) => {
      const no = nextNo(records)
      const status = actor.role === 'supervisor' ? 'menunggu-persetujuan-pegawai' : 'menunggu-approval'
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
        byRole: actor.role === 'supervisor' ? 'supervisor' : 'hr',
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

  const byOf = (id: string) => records.find((r) => r.id === id)
  const creatorRole = (r: OtRecord) => (r.byRole === 'hr' ? 'hr_personalia' : 'supervisor') as 'hr_personalia' | 'supervisor'
  const nameOf = (nik: string) => ROSTER.find((e) => e.nik === nik)?.nama ?? nik

  /** Persetujuan pegawai: via aplikasi (simulasi) atau dicatat Atasan/HR sebagai persetujuan lisan. */
  const consent = useCallback(
    (id: string, actor: OtUser, via: 'aplikasi' | 'dicatat-atasan' | 'dicatat-hr', keterangan?: string) => {
      const r = byOf(id)
      if (!r || r.status !== 'menunggu-persetujuan-pegawai') return
      const at = nowStamp()
      auditPresentasi(`Mencatat persetujuan pegawai SPL ${r.no} (${nameOf(r.nik)})`)
      notify({ to: creatorRole(r), title: 'Persetujuan pegawai masuk', body: `SPL ${r.no} disetujui ${nameOf(r.nik)}${via === 'aplikasi' ? ' di aplikasi' : ' (dicatat lisan)'}.`, page: 'overtime' })
      setRecords((rs) => rs.map((x) => (x.id === id ? { ...x, status: 'terjadwal', persetujuanPegawai: { setuju: true, at, via, oleh: via === 'aplikasi' ? undefined : actor.nama, alasan: keterangan } } : x)))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records],
  )
  const refuse = useCallback(
    (id: string, actor: OtUser, alasan: string, via: 'aplikasi' | 'dicatat-atasan' | 'dicatat-hr' = 'aplikasi') => {
      const r = byOf(id)
      if (!r || r.status !== 'menunggu-persetujuan-pegawai') return
      const at = nowStamp()
      auditPresentasi(`Mencatat penolakan pegawai SPL ${r.no} (${nameOf(r.nik)})`)
      notify({ to: 'supervisor', title: 'SPL ditolak pegawai', body: `SPL ${r.no} ditolak ${nameOf(r.nik)}: ${alasan}`, page: 'overtime' })
      setRecords((rs) => rs.map((x) => (x.id === id ? { ...x, status: 'ditolak', persetujuanPegawai: { setuju: false, at, via, alasan }, decision: { by: nameOf(x.nik), at, alasan } } : x)))
      void actor
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records],
  )
  /** Dipanggil saat halaman dibuka: SPL yang jam mulainya lewat tanpa jawaban pegawai dibatalkan otomatis. */
  const expire = useCallback(() => {
    const { hh, mm } = nowTimeWIB()
    const now = `${hh}.${mm}`
    setRecords((rs) => {
      if (!rs.some((r) => r.status === 'menunggu-persetujuan-pegawai' && startPassed(r, now))) return rs
      return rs.map((r) => (r.status === 'menunggu-persetujuan-pegawai' && startPassed(r, now) ? { ...r, status: 'dibatalkan', decision: { by: 'Sistem', at: nowStamp(), alasan: EXPIRE_REASON } } : r))
    })
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
    approve: (id: string, actor: OtUser) => { auditPresentasi(`Menyetujui lembur ${id.split('|')[0]} (${actor.nama})`); return patch(id, actor, { status: 'menunggu-persetujuan-pegawai' }) },
    consent,
    refuse,
    expire,
    reject: (id: string, actor: OtUser, alasan: string) => patch(id, actor, { status: 'ditolak' }, alasan),
    /** Validasi Atasan atas realisasi; data berlaku setelah verifikasi HRD. */
    validate: (id: string, actor: OtUser, dibayar: number, kelebihan?: string, istirahat = 0) => {
      auditPresentasi(`Memvalidasi realisasi lembur ${id.split('|')[0]} (${actor.nama})`)
      notify({ to: 'hr_personalia', title: 'Realisasi lembur menunggu verifikasi', body: `Lembur ${id.split('|')[0]} (${ROSTER.find((e) => e.nik === id.split('|')[1])?.nama ?? id.split('|')[1]}) divalidasi ${actor.nama}.`, page: 'overtime' })
      return patch(id, actor, { status: 'menunggu-verifikasi', dibayar, kelebihan, istirahat }, kelebihan)
    },
    verify,
    verifyAll,
    markTidak: (id: string, actor: OtUser) => patch(id, actor, { status: 'tidak-terealisasi', dibayar: 0 }),
    cancel: (id: string, actor: OtUser, alasan: string) => patch(id, actor, { status: 'dibatalkan' }, alasan),
  }
}
export type OvertimeApi = ReturnType<typeof useOvertime>

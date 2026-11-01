import { ROSTER } from '@/data/employees'
import { notify } from '@/data/notifications'
import { useCallback, useRef, useState } from 'react'
import {
  buildInitial,
  describe,
  empByNik,
  ingest,
  nowStamp,
  pairScans,
  SHIFTS,
  statusLabel,
  toDot,
  toMin,
  type AttendanceState,
  type DayRecord,
  type Scan, escalationLabel } from '@/data/attendance'
import { CORE as PIN_OWNERS } from '@/data/employees'
import type { CurrentUser } from '@/data/users'

const ROSTER_BY_PIN = (pin: string | null) => (pin ? PIN_OWNERS.find((e) => e.pin === pin) : undefined)

export type CorrectionInput = { masuk: string; pulang: string; alasan: string; lampiran?: string }

/** id harian `nik|tanggal` → "Nama (tanggal)". */
const korLabel = (id: string) => { const [nik, date] = id.split('|'); return `${ROSTER.find((e) => e.nik === nik)?.nama ?? nik} (${date})` }

export function useAttendance() {
  const [state, setState] = useState<AttendanceState>(buildInitial)
  const ref = useRef(state)
  ref.current = state

  const patch = useCallback((id: string, fn: (r: DayRecord) => DayRecord) => {
    setState((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? fn(r) : r)) }))
  }, [])

  const submitCorrection = useCallback(
    (id: string, input: CorrectionInput, actor: CurrentUser) => {
      const at = nowStamp()
      // Koreksi Atasan dieskalasi ke HR & GA Manager (tidak ada self-approval); selain itu ke HR Personalia.
      if (actor.role === 'supervisor') notify({ to: 'manager', title: 'Koreksi absen Atasan menunggu approval', body: `${actor.nama} mengajukan koreksi absen ${korLabel(id)}.`, page: 'attendance' })
      else if (actor.role !== 'hr_personalia') notify({ to: 'hr_personalia', title: 'Koreksi absen diajukan', body: `${actor.nama} mengajukan koreksi absen ${korLabel(id)}.`, page: 'attendance' })
      patch(id, (r) => ({
        ...r,
        pending: { by: actor.nama, role: actor.role, ...input, at },
        audit: [...r.audit, { at, by: actor.nama, action: 'Mengajukan koreksi', before: statusLabel(r), after: actor.role === 'supervisor' ? `Menunggu Approval Manager (diteruskan ke ${escalationLabel({ by: actor.nama })})` : 'Menunggu Approval' }],
      }))
    },
    [patch],
  )

  const approve = useCallback(
    (id: string, actor: CurrentUser) => {
      const at = nowStamp()
      patch(id, (r) => {
        const c = r.pending
        if (!c) return r
        const before = `${statusLabel(r)} (${r.masuk ?? '—'} – ${r.pulang ?? '—'})`
        const next: DayRecord = {
          ...r,
          masuk: c.masuk,
          pulang: c.pulang,
          pulangNext: r.shift === 'malam' && toMin(c.pulang) < 720,
          pending: undefined,
          corrected: true,
        }
        return {
          ...next,
          audit: [...r.audit, { at, by: actor.nama, action: 'Menyetujui koreksi', before, after: `${statusLabel(next)} (${c.masuk} – ${c.pulang})` }],
        }
      })
    },
    [patch],
  )

  const reject = useCallback(
    (id: string, alasan: string, actor: CurrentUser) => {
      const at = nowStamp()
      patch(id, (r) => {
        const next = { ...r, pending: undefined }
        return {
          ...next,
          audit: [...r.audit, { at, by: actor.nama, action: `Menolak koreksi · ${alasan}`, before: 'Menunggu Approval', after: statusLabel(next) }],
        }
      })
    },
    [patch],
  )

  const confirmAlfa = useCallback(
    (id: string, actor: CurrentUser) => {
      const at = nowStamp()
      patch(id, (r) => ({
        ...r,
        alfaConfirmed: { by: actor.nama, at },
        audit: [...r.audit, { at, by: actor.nama, action: 'Konfirmasi Alfa', before: 'Alfa (belum dikonfirmasi)', after: 'Alfa (dikonfirmasi)' }],
      }))
    },
    [patch],
  )

  const mapPin = useCallback((pin: string, nik: string, actor: CurrentUser) => {
    const at = nowStamp()
    const emp = empByNik(nik)
    if (!emp) return
    setState((s) => ({
      ...s,
      pinMap: { ...s.pinMap, [pin]: nik },
      records: s.records.map((r) => {
        if (r.pin !== pin || r.nik) return r
        const p = pairScans(s.scans, pin, r.date, emp.shift)
        const next: DayRecord = { ...r, nik, shift: emp.shift, masuk: p.masuk, pulang: p.pulang, pulangNext: p.pulangNext }
        return {
          ...next,
          audit: [...r.audit, { at, by: actor.nama, action: 'Petakan PIN', before: `PIN ${pin} tidak terdaftar`, after: `${emp.nama} (${emp.nik}) · ${statusLabel(next)}` }],
        }
      }),
    }))
  }, [])

  const importScans = useCallback((rows: Scan[]) => {
    const out = ingest(ref.current, rows)
    setState((s) => ({ ...s, scans: out.scans, records: out.records }))
    return { fresh: out.fresh, existing: out.existing }
  }, [])

  const close = useCallback((actor: CurrentUser) => {
    setState((s) => ({ ...s, closed: { at: nowStamp(), by: actor.nama } }))
  }, [])

  /**
   * Skenario demo: menyelesaikan semua anomali dan approval periode ini (catatan audit "oleh skenario demo"),
   * lalu closing, sama seperti tombol Closing Kehadiran di halaman Absensi. Hanya untuk prototipe.
   */
  const closeDemo = useCallback((actor: CurrentUser) => {
    setState((s) => {
      const at = nowStamp()
      const by = 'Skenario demo'
      const pinMap = { ...s.pinMap }
      const settle = (r: DayRecord): DayRecord => {
        if (r.leave) return r
        const note = (action: string, before: string, next: DayRecord) => ({ ...next, audit: [...next.audit, { at, by, action: `${action} (oleh skenario demo)`, before, after: statusLabel(next) }] })
        if (r.pending) {
          const c = r.pending
          return note('Menyetujui koreksi', statusLabel(r), { ...r, masuk: c.masuk, pulang: c.pulang, pulangNext: r.shift === 'malam' && toMin(c.pulang) < 720, pending: undefined, corrected: true })
        }
        const d = describe(r)
        if (d.key === 'unmapped') {
          // PIN tanpa pemilik dipetakan ke pegawai yang memakainya di data seed (Lukman Hakim).
          const emp = ROSTER_BY_PIN(r.pin) ?? empByNik('PPI-2025-0071')
          if (!emp) return r
          pinMap[r.pin!] = emp.nik
          const p = pairScans(s.scans, r.pin!, r.date, emp.shift)
          return settle(note('Petakan PIN', `PIN ${r.pin} tidak terdaftar`, { ...r, nik: emp.nik, shift: emp.shift, masuk: p.masuk, pulang: p.pulang, pulangNext: p.pulangNext }))
        }
        if (d.key === 'alfa' && !r.alfaConfirmed) return note('Konfirmasi Alfa', 'Alfa (belum dikonfirmasi)', { ...r, alfaConfirmed: { by, at } })
        if ((d.key === 'noMasuk' || d.key === 'noPulang') && r.shift) {
          const sh = SHIFTS[r.shift]
          return note('Koreksi jam scan', statusLabel(r), { ...r, masuk: r.masuk ?? toDot(sh.start), pulang: r.pulang ?? toDot(sh.end % 1440), pulangNext: r.shift === 'malam', corrected: true })
        }
        return r
      }
      return { ...s, pinMap, records: s.records.map(settle), closed: { at, by: `${actor.nama} (skenario demo)` } }
    })
  }, [])

  return { state, submitCorrection, approve, reject, confirmAlfa, mapPin, importScans, close, closeDemo }
}

export type AttendanceApi = ReturnType<typeof useAttendance>

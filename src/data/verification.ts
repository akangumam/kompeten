import { empOf, type LeaveRequest } from '@/data/leave'
import type { OtRecord } from '@/data/overtime'

/** Item yang masih menunggu verifikasi HRD pada rentang tanggal; memblokir Closing Kehadiran. */
export function pendingVerification(leaves: LeaveRequest[], ot: OtRecord[], start: string, end: string): string[] {
  const l = leaves.filter((r) => r.status === 'menunggu-hrd' && r.start >= start && r.start <= end).map((r) => `${r.no} · ${empOf(r.nik).nama} (${r.jenis})`)
  const o = ot.filter((r) => r.status === 'menunggu-verifikasi' && r.date >= start && r.date <= end).map((r) => `${r.no} · ${empOf(r.nik).nama} (Lembur)`)
  return [...l, ...o]
}

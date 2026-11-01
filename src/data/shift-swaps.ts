import type { LeaveStatus } from '@/data/leave'

export type WorkShift = 'pagi' | 'siang' | 'malam'

export type ShiftSwap = {
  no: string
  date: string
  nikA: string
  nikB: string
  shiftA: WorkShift
  shiftB: WorkShift
  alasan: string
  status: LeaveStatus
  by: string
  at: string
  decision?: { by: string; at: string; alasan?: string }
}

const ADM = 'Teddy Syahputra'

export const SEED_SWAPS: ShiftSwap[] = [
  {
    no: 'TKS-2026-0041',
    date: '2026-11-06',
    nikA: 'PPI-2023-0088',
    nikB: 'PPI-2022-0045',
    shiftA: 'pagi',
    shiftB: 'siang',
    alasan: 'Kontrol gigi pagi hari di Puskesmas',
    status: 'menunggu',
    by: ADM,
    at: '26 Okt 2026, 08.10 WIB',
  },
  {
    no: 'TKS-2026-0040',
    date: '2026-11-02',
    nikA: 'PPI-2024-0093',
    nikB: 'PPI-2025-0071',
    shiftA: 'pagi',
    shiftB: 'siang',
    alasan: 'Ada keperluan keluarga pagi hari',
    status: 'disetujui',
    by: ADM,
    at: '20 Okt 2026, 10.30 WIB',
    decision: { by: 'Hendra Gunawan', at: '21 Okt 2026, 08.45 WIB' },
  },
  {
    no: 'TKS-2026-0039',
    date: '2026-10-30',
    nikA: 'PPI-2024-0112',
    nikB: 'PPI-2025-0071',
    shiftA: 'pagi',
    shiftB: 'siang',
    alasan: 'Antar anak ke sekolah pagi',
    status: 'ditolak',
    by: ADM,
    at: '23 Okt 2026, 09.15 WIB',
    decision: { by: 'Hendra Gunawan', at: '23 Okt 2026, 13.40 WIB', alasan: 'Line 2 butuh operator senior di shift pagi' },
  },
]

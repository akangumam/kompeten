import type { LeaveStatus } from '@/data/leave'

export type WorkShift = 'pagi' | 'siang' | 'malam'

/** Status tukar shift: status persetujuan Atasan + tahap konfirmasi pegawai di depannya. */
export type SwapStatus = LeaveStatus | 'menunggu-konfirmasi'
export type SwapConfirm = { status: 'menunggu' | 'setuju' | 'menolak'; at?: string; via?: 'aplikasi' | 'dicatat-hr'; oleh?: string; keterangan?: string }
export const SWAP_STATUS_LABEL = 'Menunggu Konfirmasi'
export const isSwapPending = (s: SwapStatus) => s === 'menunggu' || s === 'menunggu-manager' || s === 'menunggu-konfirmasi'

export type ShiftSwap = {
  no: string
  date: string
  nikA: string
  nikB: string
  shiftA: WorkShift
  shiftB: WorkShift
  alasan: string
  status: SwapStatus
  by: string
  at: string
  /** Siapa yang memulai: pegawai (dari aplikasi) atau HR Personalia. */
  diajukanOleh: 'pegawai' | 'hr'
  /** NIP pemohon bila diajukan pegawai. */
  pemohon?: string
  konfirmasi: Record<string, SwapConfirm>
  decision?: { by: string; at: string; alasan?: string }
}

const ADM = 'Teddy Syahputra'
/** Seed lama: kedua pegawai sudah mengonfirmasi lewat HR, supaya riwayatnya tetap valid. */
const hrOk = (a: string, b: string, at: string): Record<string, SwapConfirm> => ({
  [a]: { status: 'setuju', at, via: 'dicatat-hr', oleh: ADM, keterangan: 'Disetujui lisan saat dihubungi HR' },
  [b]: { status: 'setuju', at, via: 'dicatat-hr', oleh: ADM, keterangan: 'Disetujui lisan saat dihubungi HR' },
})

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
    diajukanOleh: 'hr',
    konfirmasi: hrOk('PPI-2023-0088', 'PPI-2022-0045', '26 Okt 2026, 09.00 WIB'),
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
    diajukanOleh: 'hr',
    konfirmasi: hrOk('PPI-2024-0093', 'PPI-2025-0071', '20 Okt 2026, 14.00 WIB'),
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
    diajukanOleh: 'hr',
    konfirmasi: hrOk('PPI-2024-0112', 'PPI-2025-0071', '23 Okt 2026, 11.00 WIB'),
    at: '23 Okt 2026, 09.15 WIB',
    decision: { by: 'Hendra Gunawan', at: '23 Okt 2026, 13.40 WIB', alasan: 'Line 2 butuh operator senior di shift pagi' },
  },
  {
    no: 'TKS-2026-0042',
    date: '2026-11-04',
    nikA: 'PPI-2024-0112',
    nikB: 'PPI-2025-0071',
    shiftA: 'pagi',
    shiftB: 'siang',
    alasan: 'Ada urusan administrasi sekolah anak di pagi hari',
    status: 'menunggu-konfirmasi',
    by: 'Rizky Pratama',
    diajukanOleh: 'pegawai',
    pemohon: 'PPI-2024-0112',
    konfirmasi: {
      'PPI-2024-0112': { status: 'setuju', at: '26 Okt 2026, 07.55 WIB', via: 'aplikasi' },
      'PPI-2025-0071': { status: 'menunggu' },
    },
    at: '26 Okt 2026, 07.55 WIB',
  },
  {
    no: 'TKS-2026-0043',
    date: '2026-11-05',
    nikA: 'PPI-2024-0093',
    nikB: 'PPI-2022-0045',
    shiftA: 'pagi',
    shiftB: 'siang',
    alasan: 'Menghadiri acara keluarga di pagi hari',
    status: 'menunggu',
    by: 'Yusuf Maulana',
    diajukanOleh: 'pegawai',
    pemohon: 'PPI-2024-0093',
    konfirmasi: {
      'PPI-2024-0093': { status: 'setuju', at: '25 Okt 2026, 18.20 WIB', via: 'aplikasi' },
      'PPI-2022-0045': { status: 'setuju', at: '25 Okt 2026, 19.05 WIB', via: 'aplikasi' },
    },
    at: '25 Okt 2026, 18.20 WIB',
  },
]

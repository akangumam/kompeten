import { Ban, CalendarClock, CircleCheck, CircleSlash, CircleX, Hourglass, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { OT_LABEL, type OtStatus } from '@/data/overtime'

const META: Record<OtStatus, { variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; icon: LucideIcon }> = {
  'menunggu-approval': { variant: 'info', icon: Hourglass },
  'menunggu-persetujuan-pegawai': { variant: 'info', icon: UserCheck },
  terjadwal: { variant: 'neutral', icon: CalendarClock },
  'menunggu-validasi': { variant: 'warning', icon: Hourglass },
  'menunggu-validasi-manager': { variant: 'info', icon: Hourglass },
  'menunggu-verifikasi': { variant: 'warning', icon: ShieldCheck },
  tervalidasi: { variant: 'success', icon: CircleCheck },
  'tidak-terealisasi': { variant: 'neutral', icon: CircleSlash },
  ditolak: { variant: 'danger', icon: CircleX },
  dibatalkan: { variant: 'neutral', icon: Ban },
}

export function OtStatusBadge({ status }: { status: OtStatus }) {
  const { variant, icon: Icon } = META[status]
  return (
    <StatusBadge variant={variant}>
      <Icon aria-hidden />
      {OT_LABEL[status]}
    </StatusBadge>
  )
}

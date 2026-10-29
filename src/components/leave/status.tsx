import { Ban, Briefcase, CalendarDays, CalendarHeart, CircleCheck, CircleX, DoorOpen, Hourglass, LogIn, LogOut, ShieldCheck, Stethoscope, Undo2, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { STATUS_LABEL, type Jenis, type LeaveStatus } from '@/data/leave'

const META: Record<LeaveStatus, { variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; icon: LucideIcon }> = {
  menunggu: { variant: 'info', icon: Hourglass },
  'menunggu-manager': { variant: 'info', icon: Hourglass },
  'menunggu-hrd': { variant: 'warning', icon: ShieldCheck },
  pembatalan: { variant: 'info', icon: Undo2 },
  disetujui: { variant: 'success', icon: CircleCheck },
  ditolak: { variant: 'danger', icon: CircleX },
  dibatalkan: { variant: 'neutral', icon: Ban },
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const { variant, icon: Icon } = META[status]
  return (
    <StatusBadge variant={variant}>
      <Icon aria-hidden />
      {STATUS_LABEL[status]}
    </StatusBadge>
  )
}

export const JENIS_ICON: Record<Jenis, LucideIcon> = {
  'Cuti Tahunan': CalendarDays,
  'Cuti Khusus': CalendarHeart,
  Izin: DoorOpen,
  'Izin Terlambat': LogIn,
  'Izin Pulang Cepat': LogOut,
  Sakit: Stethoscope,
  Dinas: Briefcase,
}

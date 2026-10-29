import { CalendarOff, CircleCheck, CircleHelp, Clock, Hourglass, TriangleAlert, Umbrella } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Badge, BadgeIcon } from '@/data/attendance'

const ICONS: Record<BadgeIcon, typeof Clock> = {
  ok: CircleCheck,
  clock: Clock,
  alert: TriangleAlert,
  hourglass: Hourglass,
  leave: Umbrella,
  off: CalendarOff,
  pin: CircleHelp,
}

export function DayStatus({ badges }: { badges: Badge[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((b) => {
        const Icon = ICONS[b.icon]
        return (
          <StatusBadge key={b.text} variant={b.variant}>
            <Icon aria-hidden />
            {b.text}
          </StatusBadge>
        )
      })}
    </div>
  )
}

export function LiburBadge() {
  return (
    <StatusBadge variant="neutral">
      <CalendarOff aria-hidden />
      Libur
    </StatusBadge>
  )
}

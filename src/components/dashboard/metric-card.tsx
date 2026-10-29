import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  icon: LucideIcon
  iconClass: string
  delta: string
  trend?: 'up' | 'down'
  tone: 'success' | 'danger' | 'warning' | 'info'
  onClick?: () => void
  active?: boolean
}

const TONE = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', info: 'text-info' }

export function MetricCard({ label, value, icon: Icon, iconClass, delta, trend, tone, onClick, active }: Props) {
  const Trend = trend === 'up' ? TrendingUp : TrendingDown
  return (
    <a
      href="#"
      aria-pressed={onClick ? !!active : undefined}
      onClick={(e) => {
        e.preventDefault()
        onClick?.()
      }}
      className="group block cursor-pointer rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Card className={cn('h-full transition-colors group-hover:bg-accent/50', active && 'ring-2 ring-ring')}>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Icon className={cn('size-5', iconClass)} aria-hidden />
            </span>
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
          <div className={cn('flex items-center gap-1.5 text-sm', trend ? TONE[tone] : 'text-muted-foreground')}>
            {trend && <Trend className="size-4" aria-hidden />}
            <span>{delta}</span>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}

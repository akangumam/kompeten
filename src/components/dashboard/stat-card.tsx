import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type Trend = 'up' | 'down' | 'neutral'

type Props = {
  label: string
  value: ReactNode
  /** Teks delta singkat misal "+12%" atau "3 keluar" */
  delta?: string
  /** ikon di dalam Badge delta */
  deltaIcon?: LucideIcon
  trend?: Trend
  /** Baris ringkasan footer (font-medium) */
  summary?: string
  /** Baris keterangan footer (text-muted-foreground) */
  description?: string
  /** Ikon kategori (pengganti tren bila tidak ada tren) */
  categoryIcon?: LucideIcon
  onClick?: () => void
  active?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  delta,
  deltaIcon: DeltaIcon,
  trend = 'neutral',
  summary,
  description,
  categoryIcon: CategoryIcon,
  onClick,
  active,
  className,
}: Props) {
  const badgeClass =
    trend === 'up'
      ? 'text-success border-success/30'
      : trend === 'down'
        ? 'text-danger border-danger/30'
        : ''

  return (
    <Card
      className={cn(
        '@container/card',
        onClick && 'cursor-pointer hover:bg-accent/50 transition-colors',
        active && 'ring-2 ring-ring',
        className,
      )}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {(delta || CategoryIcon) && (
          <CardAction>
            <Badge variant="outline" className={badgeClass}>
              {DeltaIcon && <DeltaIcon className="size-3" />}
              {CategoryIcon && !DeltaIcon && <CategoryIcon className="size-3" />}
              {delta}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(summary || description) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {summary && <p className="font-medium">{summary}</p>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </CardFooter>
      )}
    </Card>
  )
}

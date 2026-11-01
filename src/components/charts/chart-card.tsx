import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Kartu pembungkus chart (pola shadcn Charts): judul, deskripsi, aksi opsional, chart, footer tren + keterangan. */
export function ChartCard({
  title, description, action, trend, trendIcon: TrendIcon, note, children, className, contentClassName,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** Baris tren di footer (font-medium). */
  trend?: ReactNode
  trendIcon?: LucideIcon
  /** Keterangan di footer (muted). */
  note?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn('flex-1', contentClassName)}>{children}</CardContent>
      {(trend || note) && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {trend && (
            <div className="flex gap-2 leading-none font-medium">
              {trend}
              {TrendIcon && <TrendIcon className="size-4" aria-hidden />}
            </div>
          )}
          {note && <div className="leading-none text-muted-foreground">{note}</div>}
        </CardFooter>
      )}
    </Card>
  )
}

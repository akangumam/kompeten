import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Kartu KPI Dashboard: tinggi sama dalam satu baris, nilai besar, satu baris keterangan, dan footer opsional. */
export function KpiCard({ label, value, icon: Icon, iconClass, hint, footer }: { label: string; value: ReactNode; icon: LucideIcon; iconClass?: string; hint?: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className={cn('size-5', iconClass)} aria-hidden />
          </span>
        </div>
        <div className="whitespace-nowrap text-2xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="min-h-5 text-sm text-muted-foreground">{hint}</div>
        {footer && <div className="mt-auto border-t pt-3 text-sm">{footer}</div>}
      </CardContent>
    </Card>
  )
}

export const pct = (n: number, d = 1) => `${n.toFixed(d).replace('.', ',')}%`
export const num = (n: number) => n.toLocaleString('id-ID')

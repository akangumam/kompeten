import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const pct = (n: number, d = 1) => `${n.toFixed(d).replace('.', ',')}%`
export const num = (n: number) => n.toLocaleString('id-ID')

/** Nilai panjang (mis. Rupiah) mengecil supaya tidak terpotong atau pecah baris; nilai pendek ikut pola shadcn (text-2xl, text-3xl di kartu lebar). */
function valueSize(value: ReactNode) {
  const len = typeof value === 'string' ? value.length : 0
  if (len > 16) return 'text-xl leading-tight'
  if (len > 12) return 'whitespace-nowrap text-xl'
  if (len > 10) return 'whitespace-nowrap'
  return 'whitespace-nowrap @[250px]/card:text-3xl'
}

type Props = {
  label: string
  value: ReactNode
  /** Ikon kategori di CardAction bila tidak ada tren. */
  icon?: LucideIcon
  /** Teks badge tren (mis. "+12%"); tampil bersama ikon tren bila `trend` diisi. */
  delta?: string
  trend?: 'up' | 'down'
  /** Baris 1 footer, `font-medium`. */
  summary?: ReactNode
  /** Baris 2 footer, muted (keterangan). */
  hint?: ReactNode
  /** Elemen tambahan di footer, mis. tautan ke halaman lain. */
  footer?: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}

/**
 * Satu-satunya kartu KPI (pola shadcn dashboard-01 "SectionCards").
 * Tanpa warna latar atau nilai berwarna; bila `onClick` diisi, kartu menjadi tombol filter (`aria-pressed`).
 */
export function StatCard({ label, value, icon: Icon, delta, trend, summary, hint, footer, onClick, active, className }: Props) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp
  const card = (
    <Card className={cn('@container/card h-full', onClick && 'transition-colors group-hover:bg-accent/50', active && 'ring-2 ring-ring', className)}>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-2xl font-semibold tabular-nums', valueSize(value))}>{value}</CardTitle>
        {(delta || Icon) && (
          <CardAction>
            <Badge variant="outline">
              {delta ? (
                <>
                  {trend && <TrendIcon aria-hidden />}
                  {delta}
                </>
              ) : (
                Icon && <Icon aria-hidden />
              )}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(summary || hint || footer) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {summary && <div className="line-clamp-2 flex gap-2 font-medium">{summary}</div>}
          {hint && <div className="text-muted-foreground">{hint}</div>}
          {footer && <div>{footer}</div>}
        </CardFooter>
      )}
    </Card>
  )
  if (!onClick) return card
  return (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      className="group block h-full w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {card}
    </button>
  )
}

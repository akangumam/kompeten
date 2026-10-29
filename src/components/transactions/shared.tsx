import { ArrowRightLeft, BadgeCheck, Building2, CalendarPlus, Repeat, Shuffle, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Ban, CircleCheck, CircleX, Hourglass } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { empOf, isFuture, waitingFor, type Trx, type TrxJenis } from '@/data/transactions'
import { formatDate } from '@/lib/format'

export const JENIS_ICON: Record<TrxJenis, LucideIcon> = {
  Promosi: TrendingUp,
  Demosi: TrendingDown,
  Rotasi: Repeat,
  Mutasi: Building2,
  'Perpanjangan Kontrak': CalendarPlus,
  'Pengangkatan Tetap': BadgeCheck,
  'Pindah Kategori': Shuffle,
}
export const TRX_ICON = ArrowRightLeft

export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

export function JenisBadge({ jenis }: { jenis: TrxJenis }) {
  const Icon = JENIS_ICON[jenis]
  return (
    <StatusBadge variant="neutral">
      <Icon aria-hidden />
      {jenis}
    </StatusBadge>
  )
}

/** Status transaksi + sub-baris: "Berlaku {tanggal}" / "Sudah berlaku" / "Menunggu {nama}". */
export function TrxStatusCell({ t }: { t: Trx }) {
  const sub =
    t.status === 'disetujui' ? (isFuture(t) ? `Berlaku ${formatDate(t.efektif)}` : 'Sudah berlaku') : t.status === 'menunggu' ? `Menunggu ${waitingFor(t) ?? ''}` : null
  return (
    <div className="flex flex-col items-start gap-1">
      {t.status === 'menunggu' && <StatusBadge variant="info"><Hourglass aria-hidden />Menunggu Approval</StatusBadge>}
      {t.status === 'disetujui' && <StatusBadge variant="success"><CircleCheck aria-hidden />Disetujui</StatusBadge>}
      {t.status === 'ditolak' && <StatusBadge variant="danger"><CircleX aria-hidden />Ditolak</StatusBadge>}
      {t.status === 'dibatalkan' && <StatusBadge variant="neutral"><Ban aria-hidden />Dibatalkan</StatusBadge>}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function PersonCell({ nik }: { nik: string }) {
  const e = empOf(nik)
  if (!e) return null
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(e.nama)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="whitespace-nowrap font-medium">{e.nama}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{e.nik}</span>
      </div>
    </div>
  )
}

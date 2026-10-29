import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { LeaveStatusBadge } from '@/components/leave/status'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { empByNik } from '@/data/attendance'
import { isPending } from '@/data/leave'
import { SHIFT_LABEL } from '@/data/shift-schedule'
import type { ShiftSwap } from '@/data/shift-swaps'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'

export const canReviewSwap = (s: ShiftSwap, user: CurrentUser) => {
  if (!isPending(s.status)) return false
  if (user.role === 'manager') return true
  const a = empByNik(s.nikA)
  return user.role === 'supervisor' && s.status === 'menunggu' && a?.atasanId === user.nik
}

function Person({ nik }: { nik: string }) {
  const e = empByNik(nik)!
  return (
    <div className="flex items-center gap-2">
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

export function SwapTable({
  rows,
  user,
  onReview,
  onDetail,
  onCancel,
}: {
  rows: ShiftSwap[]
  user: CurrentUser
  onReview: (s: ShiftSwap) => void
  onDetail: (s: ShiftSwap) => void
  onCancel: (s: ShiftSwap) => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  return (
    <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(stick, head)}>No. Pengajuan</TableHead>
            <TableHead className={head}>Tanggal</TableHead>
            <TableHead className={head}>Pegawai A</TableHead>
            <TableHead className={head}>Pegawai B</TableHead>
            <TableHead className={head}>Perubahan</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className={head}>Diajukan</TableHead>
            <TableHead className={cn('text-right', head)}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                Tidak ada pengajuan tukar shift yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          )}
          {rows.map((s) => {
            const a = empByNik(s.nikA)!
            const b = empByNik(s.nikB)!
            return (
              <TableRow key={s.no} className="group h-12 hover:bg-muted/50">
                <TableCell className={cn(stick, 'font-medium tabular-nums group-hover:bg-muted')}>{s.no}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDate(s.date)}</TableCell>
                <TableCell><Person nik={s.nikA} /></TableCell>
                <TableCell><Person nik={s.nikB} /></TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs leading-snug">
                    <span className="whitespace-nowrap">{a.nama.split(' ')[0]}: {SHIFT_LABEL[s.shiftA]} → {SHIFT_LABEL[s.shiftB]}</span>
                    <span className="whitespace-nowrap">{b.nama.split(' ')[0]}: {SHIFT_LABEL[s.shiftB]} → {SHIFT_LABEL[s.shiftA]}</span>
                  </div>
                </TableCell>
                <TableCell><LeaveStatusBadge status={s.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{s.at.split(',')[0]}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canReviewSwap(s, user) && (
                      <Button size="sm" variant="outline" onClick={() => onReview(s)} aria-label={`Tinjau pengajuan ${s.no}`}>
                        Tinjau
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Aksi">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onDetail(s)}>Lihat Detail</DropdownMenuItem>
                        {isPending(s.status) && user.role === 'admin' && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onCancel(s)}>
                            Batalkan
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

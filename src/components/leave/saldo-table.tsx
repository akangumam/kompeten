import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import type { RosterEmployee } from '@/data/employees'
import { balanceOf, eligibleFrom, hakPeriode, masaKerja, type LeaveRequest } from '@/data/leave'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'

export function SaldoTable({ rows, requests }: { rows: RosterEmployee[]; requests: LeaveRequest[] }) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  return (
    <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(stick, head)}>Pegawai</TableHead>
            <TableHead className={head}>Masa Kerja</TableHead>
            <TableHead className={head}>Periode Hak</TableHead>
            <TableHead className={cn('text-right', head)}>Hak</TableHead>
            <TableHead className={cn('text-right', head)}>Cuti Bersama</TableHead>
            <TableHead className={cn('text-right', head)}>Terpakai</TableHead>
            <TableHead className={cn('text-right', head)}>Dipesan</TableHead>
            <TableHead className={cn('text-right', head)}>Sisa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                Tidak ada pegawai yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          )}
          {rows.map((e) => {
            const b = balanceOf(e, requests)
            const p = hakPeriode(e)
            const dash = <span className="text-muted-foreground">—</span>
            return (
              <TableRow key={e.nik} className="group h-12 hover:bg-muted/50">
                <TableCell className={cn(stick, 'group-hover:bg-muted')}>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(e.nama)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="whitespace-nowrap font-medium">{e.nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{e.nik}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{masaKerja(e)}</TableCell>
                <TableCell className="tabular-nums">{p ? `${formatDate(p.start)} – ${formatDate(p.end)}` : dash}</TableCell>
                <TableCell className="text-right tabular-nums">{b ? b.hak : dash}</TableCell>
                <TableCell className="text-right tabular-nums">{b ? b.cb : dash}</TableCell>
                <TableCell className="text-right tabular-nums">{b ? b.terpakai : dash}</TableCell>
                <TableCell className="text-right tabular-nums">{b ? b.dipesan : dash}</TableCell>
                <TableCell className="text-right">
                  {b ? (
                    <span className={cn('font-medium tabular-nums', b.sisa <= 2 && 'text-warning')}>{b.sisa}</span>
                  ) : (
                    <StatusBadge variant="neutral">
                      <CalendarClock aria-hidden />
                      Berhak mulai {formatDate(eligibleFrom(e))}
                    </StatusBadge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

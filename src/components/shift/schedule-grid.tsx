import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { empByNik } from '@/data/attendance'
import { initials } from '@/data/candidates'
import type { RosterEmployee } from '@/data/employees'
import { isPending, STATUS_LABEL, type LeaveRequest } from '@/data/leave'
import { dayShort, leaveOn, shiftOn, SHIFT_LABEL, weekDays, type Ctx } from '@/data/shift-schedule'
import { swapStatusLabel } from '@/components/shift/swap-status'
import { isSwapPending, type ShiftSwap } from '@/data/shift-swaps'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const dashed = 'border-dashed'
const leaveShort = (r: LeaveRequest) => (r.jenis.startsWith('Cuti') ? 'Cuti' : r.jenis)

function SwapCell({ swap, emp, label }: { swap: ShiftSwap; emp: RosterEmployee; label: string }) {
  const other = empByNik(swap.nikA === emp.nik ? swap.nikB : swap.nikA)!
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={`${label}, tukar dengan ${other.nama}, ${swap.no}, ${swapStatusLabel(swap.status, STATUS_LABEL)}`}
        >
          <StatusBadge variant="neutral" className={cn(isSwapPending(swap.status) && dashed)}>
            {label}
            <ArrowLeftRight aria-hidden />
          </StatusBadge>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Tukar dengan {other.nama} · {swap.no} · {swapStatusLabel(swap.status, STATUS_LABEL)}
      </TooltipContent>
    </Tooltip>
  )
}

export function ScheduleGrid({ rows, weekStart, ctx }: { rows: RosterEmployee[]; weekStart: string; ctx: Ctx }) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  const days = weekDays(weekStart)
  return (
    <TooltipProvider>
      <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(stick, head, 'min-w-[200px]')}>Pegawai</TableHead>
              {days.map((d) => (
                <TableHead key={d} className={cn(head, 'text-center')}>
                  <span className="block">{dayShort(d)}</span>
                  <span className="block font-normal tabular-nums">{Number(d.slice(8))} {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(d.slice(5, 7)) - 1]}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  Tidak ada pegawai shift di section ini.
                </TableCell>
              </TableRow>
            )}
            {rows.map((e) => (
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
                {days.map((d) => {
                  const lv = leaveOn(e.nik, d, ctx.leaves)
                  const { shift, swap } = shiftOn(e, d, ctx)
                  return (
                    <TableCell key={d} className="text-center">
                      {lv && shift !== 'libur' ? (
                        <StatusBadge variant="info" className={cn(isPending(lv.status) && dashed)} title={`${lv.no} · ${STATUS_LABEL[lv.status]}`}>
                          {leaveShort(lv)}
                        </StatusBadge>
                      ) : shift === 'libur' ? (
                        <span className="text-xs text-muted-foreground">Libur</span>
                      ) : swap ? (
                        <SwapCell swap={swap} emp={e} label={SHIFT_LABEL[shift]} />
                      ) : (
                        <StatusBadge variant="neutral">{SHIFT_LABEL[shift]}</StatusBadge>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { DayStatus, LiburBadge } from '@/components/attendance/day-status'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { approverOf, describe, durasi, SHIFTS, type DayRecord, type Desc } from '@/data/attendance'
import { initials } from '@/data/candidates'
import type { RosterEmployee } from '@/data/employees'
import type { CurrentUser } from '@/data/users'

export type DayRow = { key: string; rec?: DayRecord; emp?: RosterEmployee; libur?: boolean; desc?: Desc }

export type RowActions = {
  onKoreksi: (r: DayRecord) => void
  onAlfa: (r: DayRecord) => void
  onMap: (r: DayRecord) => void
  onLog: (r: DayRecord) => void
  onReview: (r: DayRecord) => void
}

const head = 'text-xs font-medium text-muted-foreground'

function Time({ value, next, missing }: { value: string | null; next?: boolean; missing: boolean }) {
  if (!value) return <span className={missing ? 'text-danger' : 'text-muted-foreground'} aria-label={missing ? 'Tidak ada scan' : undefined}>—</span>
  return (
    <span>
      {value}
      {next && <span className="text-muted-foreground"> (+1)</span>}
    </span>
  )
}

export function DailyTable({
  rows,
  user,
  closed,
  actions,
}: {
  rows: DayRow[]
  user: CurrentUser
  closed: boolean
  actions: RowActions
}) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  return (
    <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(stick, head)}>Pegawai</TableHead>
            <TableHead className={head}>Department</TableHead>
            <TableHead className={head}>Shift</TableHead>
            <TableHead className={`text-right ${head}`}>Scan Masuk</TableHead>
            <TableHead className={`text-right ${head}`}>Scan Pulang</TableHead>
            <TableHead className={`text-right ${head}`}>Durasi</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className={head}>Keterangan</TableHead>
            <TableHead className={`text-right ${head}`}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                Tidak ada data yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const { rec, emp, libur } = row
            const d = rec ? describe(rec) : null
            const unmapped = !!rec && !rec.nik
                        const canReview = !closed && !!d?.pending && (user.role === approverOf(rec!.pending!) || user.role === 'manager')
            const menu: { label: string; run: () => void }[] = []
            if (rec && d && !closed) {
              const edit = user.role !== 'payroll' // Payroll Officer hanya melihat
              if (edit && d.key === 'alfa' && !rec.alfaConfirmed) menu.push({ label: 'Konfirmasi Alfa', run: () => actions.onAlfa(rec) })
              if (edit && ['noMasuk', 'noPulang', 'alfa'].includes(d.key)) menu.push({ label: 'Koreksi', run: () => actions.onKoreksi(rec) })
              if (edit && unmapped) menu.push({ label: 'Petakan PIN', run: () => actions.onMap(rec) })
              if (!rec.leave) menu.push({ label: 'Lihat Log Scan', run: () => actions.onLog(rec) })
            }
            const nama = emp?.nama ?? (rec?.pin ? `PIN ${rec.pin}` : '')
            return (
              <TableRow key={row.key} className="group h-12 hover:bg-muted/50">
                <TableCell className={cn(stick, 'group-hover:bg-muted')}>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                        {emp ? initials(emp.nama) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="whitespace-nowrap font-medium">{nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{emp ? emp.nik : 'Belum dipetakan'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[110px] whitespace-normal">{emp?.department ?? '—'}</TableCell>
                <TableCell>
                  {emp ? (
                    <StatusBadge variant="neutral">{SHIFTS[emp.shift].label}</StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {libur ? <span className="text-muted-foreground">—</span> : <Time value={rec!.masuk} missing={!rec!.leave} />}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {libur ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Time value={rec!.pulang} next={rec!.pulangNext} missing={!rec!.leave} />
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(rec && durasi(rec)) || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{libur ? <LiburBadge /> : <DayStatus badges={d!.badges} />}</TableCell>
                <TableCell className="max-w-[120px] text-sm text-muted-foreground">
                  <span className="line-clamp-2" title={d?.keterangan}>{d?.keterangan || '—'}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canReview && (
                      <Button size="sm" variant="outline" onClick={() => actions.onReview(rec!)} aria-label={`Tinjau koreksi ${nama}`}>
                        Tinjau
                      </Button>
                    )}
                    {menu.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Aksi">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {menu.map((m) => (
                            <DropdownMenuItem key={m.label} onSelect={m.run}>{m.label}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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

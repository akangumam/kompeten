import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { LeaveStatusBadge } from '@/components/leave/status'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { approverOf, canRequestCancel, empOf, isCancelReq, isJamKerja, isPending, isVerif, rangeLabel, type LeaveRequest } from '@/data/leave'
import type { CurrentUser } from '@/data/users'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'

export function RequestTable({
  rows,
  user,
  onReview,
  onDetail,
  onCancel,
  onVerify,
  onRequestCancel,
}: {
  rows: LeaveRequest[]
  user: CurrentUser
  onReview: (r: LeaveRequest) => void
  onDetail: (r: LeaveRequest) => void
  onCancel: (r: LeaveRequest) => void
  onVerify: (r: LeaveRequest) => void
  onRequestCancel: (r: LeaveRequest) => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  return (
    <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(stick, head)}>No. Pengajuan</TableHead>
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={head}>Jenis</TableHead>
            <TableHead className={head}>Tanggal</TableHead>
            <TableHead className={cn('text-right', head)}>Hari</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className={head}>Diajukan</TableHead>
            <TableHead className={cn('text-right', head)}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                Tidak ada pengajuan yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => {
            const emp = empOf(r.nik)
            const canReview = (isPending(r.status) || isCancelReq(r.status)) && (user.role === 'manager' || (user.role === 'supervisor' && approverOf(r) === 'supervisor' && emp.atasanId === user.nik))
            const canCancel = isPending(r.status) && user.role === 'admin'
            const canVerify = isVerif(r.status) && user.role === 'admin'
            const canAskCancel = user.role === 'admin' && canRequestCancel(r)
            return (
              <TableRow key={r.no} className="group h-12 hover:bg-muted/50">
                <TableCell className={cn(stick, 'font-medium tabular-nums group-hover:bg-muted')}>{r.no}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(emp.nama)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="whitespace-nowrap font-medium">{emp.nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{emp.nik}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-0.5">
                    <StatusBadge variant="neutral">{r.jenis}</StatusBadge>
                    {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {rangeLabel(r.start, r.end)}
                  {isJamKerja(r.jenis) && <span className="block text-xs text-muted-foreground">{r.jenis === 'Izin Terlambat' ? 'Datang' : 'Pulang'} {r.jam}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{isJamKerja(r.jenis) ? '—' : r.hari}</TableCell>
                <TableCell><LeaveStatusBadge status={r.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">{r.at.split(',')[0]}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canReview && (
                      <Button size="sm" variant="outline" onClick={() => onReview(r)} aria-label={`Tinjau pengajuan ${r.no}`}>
                        Tinjau
                      </Button>
                    )}
                    {canVerify && (
                      <Button size="sm" variant="outline" onClick={() => onVerify(r)} aria-label={`Verifikasi pengajuan ${r.no}`}>
                        Verifikasi
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Aksi">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onDetail(r)}>Lihat Detail</DropdownMenuItem>
                        {canAskCancel && <DropdownMenuItem onSelect={() => onRequestCancel(r)}>Ajukan Pembatalan</DropdownMenuItem>}
                        {canCancel && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onCancel(r)}>
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

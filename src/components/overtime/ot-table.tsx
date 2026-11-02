import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { OtStatusBadge } from '@/components/overtime/status'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { dayName } from '@/data/attendance'
import { initials } from '@/data/candidates'
import type { RosterEmployee } from '@/data/employees'
import {
  canCancel,
  canDecide,
  canVerify,
  dayTypeLabel,
  dayTypeOf,
  durJam,
  fj,
  isAwaitingValidation,
  rencanaText,
  rp,
  type OtRecord,
  type OtStatus,
  type Paid,
  type Realisasi,
} from '@/data/overtime'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export type OtRow = { rec: OtRecord; emp: RosterEmployee; status: OtStatus; real: Realisasi; paid: Paid | null }

const head = 'text-xs font-medium text-muted-foreground'

export function OtTable({
  rows,
  user,
  showPay,
  onReview,
  onDetail,
  onCancel,
  onVerify,
}: {
  rows: OtRow[]
  user: CurrentUser
  showPay: boolean
  onReview: (r: OtRecord) => void
  onDetail: (r: OtRecord) => void
  onCancel: (r: OtRecord) => void
  onVerify: (r: OtRecord) => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const stick = cn('sticky left-0 z-10 bg-card', scrolled && 'border-r')
  const cols = showPay ? 9 : 8
  return (
    <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(stick, head)}>No. SPL</TableHead>
            <TableHead className={head}>Tanggal</TableHead>
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={head}>Rencana / Scan</TableHead>
            <TableHead className={cn('text-right', head)}>Realisasi</TableHead>
            <TableHead className={cn('text-right', head)}>Dibayar</TableHead>
            {showPay && <TableHead className={cn('text-right', head)}>Nominal</TableHead>}
            <TableHead className={head}>Status</TableHead>
            <TableHead className={cn('text-right', head)}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={cols} className="h-24 text-center text-sm text-muted-foreground">
                Tidak ada lembur yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          )}
          {rows.map(({ rec, emp, status, real, paid }) => {
            const showReal = isAwaitingValidation(status) || status === 'menunggu-verifikasi' || status === 'tervalidasi' || status === 'tidak-terealisasi'
            const canReview = canDecide(user, emp, status)
            const cancel = canCancel(user, emp, status)
            const verify = canVerify(user, status)
            return (
              <TableRow key={rec.id} className="group h-12 hover:bg-muted/50">
                <TableCell className={cn(stick, 'font-medium tabular-nums group-hover:bg-muted')}>{rec.no}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-0.5 leading-tight">
                    <span className="whitespace-nowrap tabular-nums">{dayName(rec.date).slice(0, 3)}, {formatDate(rec.date)}</span>
                    <StatusBadge variant="neutral" className="px-2 py-0 text-xs">
                      {dayTypeLabel(dayTypeOf(emp, rec.date))}
                    </StatusBadge>
                  </div>
                </TableCell>
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
                <TableCell className="whitespace-nowrap tabular-nums">
                  <div>{rencanaText(rec)}</div>
                  <div className="text-xs text-muted-foreground">Scan {showReal ? real.scanText : '—'}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {showReal ? (
                    <div className="flex flex-col items-end leading-tight">
                      <span>{fj(real.aktual)} j</span>
                      {isAwaitingValidation(status) && !real.hasScan && (
                        <span className="max-w-[170px] text-xs text-muted-foreground">Ajukan koreksi di Absensi bila pegawai benar-benar lembur</span>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {status === 'tidak-terealisasi' ? (
                    '0 j'
                  ) : paid ? (
                    paid.excess ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help font-medium text-warning">{fj(paid.jam)} j</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-60">
                          Realisasi {fj(real.aktual)} j melebihi rencana {fj(durJam(rec))} j. Dibayar sesuai rencana kecuali validator menyetujui kelebihan.
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      `${fj(paid.jam)} j`
                    )
                  ) : (
                    '—'
                  )}
                </TableCell>
                {showPay && (
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{paid ? rp(paid.nominal) : '—'}</TableCell>
                )}
                <TableCell><OtStatusBadge status={status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canReview && (
                      <Button size="sm" variant="outline" onClick={() => onReview(rec)} aria-label={`Tinjau lembur ${rec.no} ${emp.nama}`}>
                        Tinjau
                      </Button>
                    )}
                    {verify && (
                      <Button size="sm" variant="outline" onClick={() => onVerify(rec)} aria-label={`Verifikasi lembur ${rec.no} ${emp.nama}`}>
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
                        <DropdownMenuItem onSelect={() => onDetail(rec)}>Lihat Detail</DropdownMenuItem>
                        {cancel && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onCancel(rec)}>
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

import { FileText } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { empOf } from '@/data/leave'
import { fj, rp, type RekapRow } from '@/data/overtime'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'

export function RekapTable({
  rows,
  totals,
  showPay,
  final,
  onSlip,
}: {
  rows: RekapRow[]
  totals: RekapRow[]
  showPay: boolean
  final: boolean
  onSlip: (r: RekapRow) => void
}) {
  const sum = (f: (r: RekapRow) => number) => totals.reduce((s, r) => s + f(r), 0)
  const cols = showPay ? 8 : 5
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={cn('text-right', head)}>Hari Lembur</TableHead>
            <TableHead className={cn('text-right', head)}>Jam Dibayar</TableHead>
            <TableHead className={cn('text-right', head)}>Jam-Pengali</TableHead>
            {showPay && <TableHead className={cn('text-right', head)}>Upah Sejam</TableHead>}
            {showPay && <TableHead className={cn('text-right', head)}>Total</TableHead>}
            <TableHead className={head}>Status Slip</TableHead>
            {showPay && <TableHead className={cn('text-right', head)}>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={cols} className="h-24 text-center text-sm text-muted-foreground">
                Belum ada lembur tervalidasi pada periode ini.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => {
            const emp = empOf(r.nik)
            return (
              <TableRow key={r.nik} className="h-12 hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(emp.nama)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">{emp.nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{emp.nik}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.hari}</TableCell>
                <TableCell className="text-right tabular-nums">{fj(r.jam)} j</TableCell>
                <TableCell className="text-right tabular-nums">{fj(r.pengali)}</TableCell>
                {showPay && <TableCell className="text-right tabular-nums">{rp(r.upah)}</TableCell>}
                {showPay && <TableCell className="text-right font-medium tabular-nums">{rp(r.total)}</TableCell>}
                <TableCell>
                  <StatusBadge variant={final ? 'success' : 'neutral'}>{final ? 'Final' : 'Draft'}</StatusBadge>
                </TableCell>
                {showPay && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onSlip(r)} aria-label={`Lihat slip lembur ${emp.nama}`}>
                      <FileText className="size-4" />
                      Lihat Slip
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
        {showPay && rows.length > 0 && (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="font-medium">Total ({totals.length} pegawai)</TableCell>
              <TableCell className="text-right tabular-nums">{sum((r) => r.hari)}</TableCell>
              <TableCell className="text-right tabular-nums">{fj(sum((r) => r.jam))} j</TableCell>
              <TableCell className="text-right tabular-nums">{fj(sum((r) => r.pengali))}</TableCell>
              <TableCell />
              <TableCell className="text-right font-semibold tabular-nums">{rp(sum((r) => r.total))}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}

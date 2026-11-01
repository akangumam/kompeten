import { Pager, usePaging } from '@/components/attendance/pager'
import { KpiStatusBadge, PredikatBadge, n1 } from '@/components/kpi/shared'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DayRecord } from '@/data/attendance'
import { canInput, monthClosed, monthLabel, scoreOfRow, statusOf, type KpiRow } from '@/data/kpi/records'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'

export function InputTab({ rows, bulan, posisi, user, attendance, onOpen }: { rows: KpiRow[]; bulan: string; posisi: string; user: CurrentUser; attendance: DayRecord[]; onOpen: (r: KpiRow) => void }) {
  const paging = usePaging(rows, `${bulan}|${posisi}`)
  const closed = monthClosed(bulan)
  const spv = user.role === 'supervisor'
  return (
    <Card>
      <CardHeader>
        <CardTitle>Input bulanan {posisi}</CardTitle>
        <CardDescription>{monthLabel(bulan)} · Atasan input realisasi, lalu penyetuju berikutnya menyetujui</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Pegawai</TableHead>
              <TableHead className={head}>Posisi</TableHead>
              <TableHead className={`text-right ${head}`}>Nilai</TableHead>
              <TableHead className={head}>Predikat</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className={`text-right ${head}`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pegawai pada posisi ini di cakupan Anda.</TableCell></TableRow>}
            {paging.rows.map((r) => {
              const st = statusOf(r)
              const sc = st === 'belum' ? null : scoreOfRow(r, bulan, attendance)
              const can = canInput(user, r, bulan)
              const canTry = spv && r.emp.atasanId === user.nik && ['belum', 'draft', 'dikembalikan'].includes(st)
              return (
                <TableRow key={r.emp.nik} className="h-12">
                  <TableCell><PersonCell nama={r.emp.nama} nik={r.emp.nik} /></TableCell>
                  <TableCell>{r.posisi}</TableCell>
                  <TableCell className="text-right tabular-nums">{sc?.nilai == null ? '—' : n1(sc.nilai)}</TableCell>
                  <TableCell><PredikatBadge nilai={sc?.nilai} /></TableCell>
                  <TableCell><KpiStatusBadge status={st} /></TableCell>
                  <TableCell className="text-right">
                    {canTry && !closed ? (
                      <Tooltip>
                        <TooltipTrigger asChild><span tabIndex={0} className="inline-flex"><Button size="sm" disabled>Input</Button></span></TooltipTrigger>
                        <TooltipContent>Periode kehadiran {monthLabel(bulan)} belum closing</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button size="sm" variant={can ? 'default' : 'outline'} onClick={() => onOpen(r)}>{can ? 'Input' : 'Detail'}</Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager total={rows.length} paging={paging} />
      </CardContent>
    </Card>
  )
}

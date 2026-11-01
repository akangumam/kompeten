import { can } from '@/lib/access'
import { Pager, usePaging } from '@/components/attendance/pager'
import { PredikatBadge, n1 } from '@/components/kpi/shared'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DayRecord } from '@/data/attendance'
import { approverFor, canApprove, monthLabel, recordOf, scoreOfRow, statusOf, type KpiRow } from '@/data/kpi/records'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'
const prevMonth = (b: string) => { const [y, m] = b.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}` }

export function ApprovalTab({ rows, bulan, user, attendance, onOpen }: { rows: KpiRow[]; bulan: string; user: CurrentUser; attendance: DayRecord[]; onOpen: (r: KpiRow) => void }) {
  const waiting = rows.filter((r) => statusOf(r) === 'diajukan')
  const paging = usePaging(waiting, `${bulan}|${waiting.length}`)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menunggu persetujuan</CardTitle>
        <CardDescription>{monthLabel(bulan)} · penyetuju berikutnya dari Matriks Penyetuju; HR &amp; GA Manager boleh mewakili</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {can(user, 'dev.manage') && waiting.length > 0 && <p className="text-sm text-muted-foreground">Persetujuan oleh atasan penilai atau HR &amp; GA Manager. HR Development & Industrial hanya dapat melihat detail.</p>}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Pegawai</TableHead>
              <TableHead className={head}>Diajukan</TableHead>
              <TableHead className={`text-right ${head}`}>Nilai</TableHead>
              <TableHead className={head}>Predikat</TableHead>
              <TableHead className={`text-right ${head}`}>Bulan lalu</TableHead>
              <TableHead className={head}>Penyetuju</TableHead>
              <TableHead className={`text-right ${head}`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waiting.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada KPI yang menunggu persetujuan.</TableCell></TableRow>}
            {paging.rows.map((r) => {
              const sc = scoreOfRow(r, bulan, attendance)
              const prevRec = recordOf(r.emp.nik, prevMonth(bulan))
              const prev = prevRec ? scoreOfRow({ ...r, rec: prevRec }, prevMonth(bulan), attendance).nilai : null
              const can = canApprove(user, r)
              return (
                <TableRow key={r.emp.nik} className="h-12">
                  <TableCell><PersonCell nama={r.emp.nama} nik={r.emp.nik} /></TableCell>
                  <TableCell className="text-sm"><span className="block">{r.rec?.diajukan?.by}</span><span className="text-xs text-muted-foreground tabular-nums">{r.rec?.diajukan?.at}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{sc.nilai == null ? '—' : n1(sc.nilai)}</TableCell>
                  <TableCell><PredikatBadge nilai={sc.nilai} /></TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{prev == null ? '—' : n1(prev)}</TableCell>
                  <TableCell>{approverFor(r.emp).nama}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant={can ? 'default' : 'outline'} onClick={() => onOpen(r)}>{can ? 'Tinjau' : 'Detail'}</Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager total={waiting.length} paging={paging} />
      </CardContent>
    </Card>
  )
}

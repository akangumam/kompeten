import { TriangleAlert } from 'lucide-react'
import { AssessBadge } from '@/components/competency/shared'
import { Pager, usePaging } from '@/components/attendance/pager'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { atasanName } from '@/data/directory'
import { canAssess, canReview, scoreOfRow, standardFor, statusOf, type CompRow } from '@/data/competency/assessments'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'

export function AssessmentTab({ rows, posisi, periodId, periodLabel, user, onOpen }: { rows: CompRow[]; posisi: string; periodId: string; periodLabel: string; user: CurrentUser; onOpen: (r: CompRow) => void }) {
  const paging = usePaging(rows, `${periodId}|${posisi}`)
  const std = standardFor(posisi, periodId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Penilaian {posisi}</CardTitle>
        <CardDescription>{periodLabel} · diisi Atasan, diverifikasi Admin HRD, lalu Final dan dikunci</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!std && (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertDescription>Standar belum diatur untuk posisi {posisi}, jadi penilaian belum bisa diisi.</AlertDescription>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Pegawai</TableHead>
              <TableHead className={head}>Posisi</TableHead>
              <TableHead className={head}>Penilai (Atasan)</TableHead>
              <TableHead className={head}>Progres</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className={`text-right ${head}`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pegawai pada posisi ini di cakupan Anda.</TableCell>
              </TableRow>
            )}
            {paging.rows.map((r) => {
              const sc = scoreOfRow(r, periodId)
              const st = statusOf(r)
              const assess = canAssess(user, r, periodId) && !!std
              const review = canReview(user, r, periodId)
              return (
                <TableRow key={r.emp.nik} className="h-12">
                  <TableCell><PersonCell nama={r.emp.nama} nik={r.emp.nik} /></TableCell>
                  <TableCell>{r.posisi}</TableCell>
                  <TableCell>{r.a?.penilai ?? atasanName(r.emp.atasanId)}</TableCell>
                  <TableCell className="tabular-nums">{sc.rated}/{sc.total} <span className="text-muted-foreground">dinilai</span></TableCell>
                  <TableCell><AssessBadge status={st} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant={assess || review ? 'default' : 'outline'} size="sm" onClick={() => onOpen(r)}>
                      {assess ? 'Nilai' : review ? 'Tinjau' : 'Detail'}
                    </Button>
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

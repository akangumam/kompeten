import { useState } from 'react'
import { AssessmentSheet } from '@/components/competency/assessment-sheet'
import { AssessBadge, pctText } from '@/components/competency/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PERIODS, assessmentOf, canAccessCompetency, scoreOfRow, standardFor, statusOf, useCompetency, type CompRow } from '@/data/competency/assessments'
import { ROSTER } from '@/data/employees'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'

/** Tab Kompetensi di Profil Pegawai: riwayat per semester beserta detail penilaian. */
export function KompetensiTab({ nik, user }: { nik: string; user: CurrentUser }) {
  useCompetency()
  const [open, setOpen] = useState<{ row: CompRow; periodId: string } | null>(null)
  const emp = ROSTER.find((e) => e.nik === nik)
  if (!emp || !canAccessCompetency(user.role)) return null
  const rows = PERIODS.map((p) => {
    const a = assessmentOf(p.id, nik)
    const row: CompRow = { emp, posisi: a?.posisi ?? emp.posisi, a }
    return { p, row, sc: scoreOfRow(row, p.id), hasStd: !!standardFor(row.posisi, p.id, a) }
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Kompetensi</CardTitle>
        <CardDescription>Penilaian per semester terhadap standar posisi. Penilaian yang sudah Final dikunci.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Periode</TableHead>
              <TableHead className={head}>Posisi</TableHead>
              <TableHead className={head}>Dinilai</TableHead>
              <TableHead className={`text-right ${head}`}>Pemenuhan</TableHead>
              <TableHead className={`text-right ${head}`}>Total gap</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className={`text-right ${head}`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ p, row, sc, hasStd }) => {
              const st = statusOf(row)
              return (
                <TableRow key={p.id} className="h-12">
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell>{row.posisi}{!hasStd && <span className="block text-xs text-warning">Standar belum diatur</span>}</TableCell>
                  <TableCell className="tabular-nums">{sc.rated}/{sc.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{pctText(sc.pct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{st === 'belum' ? '—' : sc.totalGap}</TableCell>
                  <TableCell><AssessBadge status={st} /></TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setOpen({ row, periodId: p.id })}>Detail</Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
      <AssessmentSheet row={open?.row ?? null} periodId={open?.periodId ?? PERIODS[0].id} user={user} onClose={() => setOpen(null)} />
    </Card>
  )
}

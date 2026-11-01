import { useState } from 'react'
import { KpiSection } from '@/components/employee/kpi-section'
import { KompetensiTab } from '@/components/employee/kompetensi-tab'
import { CertLink, CertificateDialog, EnrBadge, TypeBadge } from '@/components/training/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { historyOf, progressOf, useTraining } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'

/** Tab Pengembangan di Profil Pegawai: Kompetensi (11a) · Riwayat Training (11b) · KPI (11c). */
export function PengembanganTab({ nik, user }: { nik: string; user: CurrentUser }) {
  useTraining()
  const [cert, setCert] = useState<string | null>(null)
  const history = historyOf(nik)
  return (
    <div className="space-y-6">
      <KompetensiTab nik={nik} user={user} />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Training</CardTitle>
          <CardDescription>Program yang diikuti, hasil uji, dan sertifikat</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Program</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Nilai uji</TableHead>
                <TableHead className={head}>Sertifikat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">Belum pernah mengikuti program training.</TableCell></TableRow>}
              {history.map(({ program, enr, status }) => {
                const pr = progressOf(program, enr)
                return (
                  <TableRow key={program.kode} className="h-12">
                    <TableCell><span className="font-medium">{program.judul}</span> <span className="text-xs tabular-nums text-muted-foreground">{program.kode}</span> <TypeBadge tipe={program.tipe} /></TableCell>
                    <TableCell><EnrBadge status={status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{pr.nilai ?? '—'}</TableCell>
                    <TableCell><CertLink no={enr.sertifikat} onOpen={setCert} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <KpiSection nik={nik} />
      <CertificateDialog no={cert} onClose={() => setCert(null)} />
    </div>
  )
}

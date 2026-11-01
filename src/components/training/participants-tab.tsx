import { can } from '@/lib/access'
import { MoreHorizontal, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pager, usePaging } from '@/components/attendance/pager'
import { PersonCell } from '@/components/payroll/pay/shared'
import { CertLink, EnrBadge, MiniProgress, UjiBadge } from '@/components/training/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PROPOSALS, decideProposal, empOf, enrStatus, ENROLLMENTS, programOf, progressOf, type Program } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'

export function ParticipantsTab({ programs, user, onDetail, onUji, onCert, onPropose }: {
  programs: Program[]
  user: CurrentUser
  onDetail: (kode: string, nik: string) => void
  onUji: (kode: string, nik: string) => void
  onCert: (no: string) => void
  onPropose: () => void
}) {
  const [q, setQ] = useState('')
  const [fProg, setFProg] = useState(ALL)
  const admin = can(user, 'dev.manage')
  const spv = user.role === 'supervisor'
  const codes = new Set(programs.map((p) => p.kode))
  const rows = ENROLLMENTS
    .filter((e) => codes.has(e.programKode))
    .filter((e) => !spv || empOf(e.nik)?.atasanId === user.nik)
    .filter((e) => fProg === ALL || e.programKode === fProg)
    .filter((e) => !q.trim() || `${empOf(e.nik)?.nama} ${e.nik}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.programKode.localeCompare(a.programKode) || (empOf(a.nik)?.nama ?? '').localeCompare(empOf(b.nik)?.nama ?? ''))
  const paging = usePaging(rows, `${q}|${fProg}|${rows.length}`)
  const pending = PROPOSALS.filter((x) => x.status === 'menunggu')

  return (
    <div className="space-y-6">
      {admin && pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usulan peserta dari Atasan</CardTitle>
            <CardDescription>{pending.length} usulan menunggu keputusan HR Development & Industrial</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border">
              {pending.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <span><b>{empOf(x.nik)?.nama}</b> → {programOf(x.programKode)?.judul} <span className="text-muted-foreground">· diusulkan {x.by}, {x.at}</span></span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decideProposal(x.id, false)}>Abaikan</Button>
                    <Button size="sm" onClick={() => { decideProposal(x.id, true); toast.success(`${empOf(x.nik)?.nama} ditambahkan ke ${x.programKode}`) }}>Tambahkan</Button>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Peserta &amp; progres</CardTitle>
          <CardDescription>{spv ? 'Progres anggota tim Anda' : 'Validasi materi, input nilai uji (simulasi), dan sertifikat'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari peserta" placeholder="Cari nama atau NIP…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={fProg} onValueChange={setFProg}>
              <SelectTrigger aria-label="Program" className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Semua Program</SelectItem>{programs.map((p) => <SelectItem key={p.kode} value={p.kode}>{p.kode} · {p.judul}</SelectItem>)}</SelectContent>
            </Select>
            {spv && <Button variant="outline" className="ml-auto" onClick={onPropose}>Usulkan peserta</Button>}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Pegawai</TableHead>
                <TableHead className={head}>Program</TableHead>
                <TableHead className={head}>Progres materi wajib</TableHead>
                <TableHead className={head}>Kehadiran</TableHead>
                <TableHead className={head}>Uji</TableHead>
                <TableHead className={head}>Sertifikat</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada peserta yang cocok.</TableCell></TableRow>}
              {paging.rows.map((e) => {
                const p = programOf(e.programKode)!
                const pr = progressOf(p, e)
                const emp = empOf(e.nik)
                return (
                  <TableRow key={`${e.programKode}|${e.nik}`} className="h-14">
                    <TableCell><PersonCell nama={emp?.nama ?? e.nik} nik={e.nik} /></TableCell>
                    <TableCell><span className="font-medium">{p.judul}</span> <span className="block text-xs tabular-nums text-muted-foreground">{p.kode} · <EnrBadgeInline p={p} e={e} /></span></TableCell>
                    <TableCell>{pr.wajib ? <MiniProgress value={pr.tervalidasi} total={pr.wajib} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="tabular-nums">{pr.sesiWajib ? `${pr.hadir}/${pr.sesiWajib} sesi` : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><UjiBadge pr={pr} /></TableCell>
                    <TableCell><CertLink no={e.sertifikat} onOpen={onCert} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onDetail(e.programKode, e.nik)}>Detail</DropdownMenuItem>
                          {admin && pr.menunggu > 0 && <DropdownMenuItem onSelect={() => onDetail(e.programKode, e.nik)}>Validasi materi ({pr.menunggu})</DropdownMenuItem>}
                          {admin && (pr.uji === 'terbuka' || pr.uji === 'tidak-lulus') && <DropdownMenuItem onSelect={() => onUji(e.programKode, e.nik)}>Input nilai uji (simulasi)</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pager total={rows.length} paging={paging} />
        </CardContent>
      </Card>
    </div>
  )
}

function EnrBadgeInline({ p, e }: { p: Program; e: (typeof ENROLLMENTS)[number] }) {
  return <span className="inline-block align-middle"><EnrBadge status={enrStatus(p, e)} /></span>
}

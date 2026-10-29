import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PagedFooter, pageSlice } from '@/components/recruitment/pager'
import { PaketSheet } from '@/components/recruitment/paket-sheet'
import { LulusBadge, Row, StageBadge, TestBadge } from '@/components/recruitment/shared'
import { ResendDialog, ScoreDialog, nilaiCell } from '@/components/recruitment/tests-parts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { candidateOf } from '@/data/candidates'
import { JOBS } from '@/data/recruitment/jobs'
import { useRecruitment } from '@/data/recruitment/store'
import { ASSIGNS, KIND_LABEL, PAKET, effTestStatus, lulusOf, paketOf, savePaket, type PaketTes, type TestAssign, type TestStatus } from '@/data/recruitment/tests'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'
const STATUSES: TestStatus[] = ['Dijadwalkan', 'Sedang dikerjakan', 'Selesai', 'Kedaluwarsa']

export default function RecruitmentTestsPage({ user, onOpenCandidate }: { user: CurrentUser; onOpenCandidate: (id: string) => void }) {
  useRecruitment()
  const admin = user.role === 'admin'
  const [tab, setTab] = useState('paket')
  const [paketSheet, setPaketSheet] = useState<{ paket?: PaketTes; ro: boolean } | null>(null)
  const [q, setQ] = useState('')
  const [fPaket, setFPaket] = useState(ALL)
  const [fStatus, setFStatus] = useState(ALL)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [detail, setDetail] = useState<TestAssign | null>(null)
  const [score, setScore] = useState<TestAssign | null>(null)
  const [resend, setResend] = useState<TestAssign | null>(null)

  const hasil = ASSIGNS
    .filter((a) => fPaket === ALL || a.paketId === fPaket)
    .filter((a) => fStatus === ALL || effTestStatus(a) === fStatus)
    .filter((a) => { const c = candidateOf(a.kandidatId); return !q.trim() || `${c?.nama} ${a.kandidatId}`.toLowerCase().includes(q.trim().toLowerCase()) })
    .sort((a, b) => b.jadwal.localeCompare(a.jadwal) || b.id.localeCompare(a.id))
  const rows = pageSlice(hasil, page, perPage)
  const usedBy = (id: string) => JOBS.filter((j) => j.paketIds.includes(id))

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu Tes</h1>
          <p className="text-sm text-muted-foreground">Paket tes seleksi dan hasil tes kandidat. Pengerjaan online oleh pelamar dibuat pada tahap berikutnya; saat ini nilai dapat diinput manual.</p>
        </div>
        {admin && tab === 'paket' && <Button onClick={() => setPaketSheet({ ro: false })}><Plus className="size-4" />Tambah Paket Tes</Button>}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList><TabsTrigger value="paket">Paket Tes ({PAKET.length})</TabsTrigger><TabsTrigger value="hasil">Hasil Tes ({ASSIGNS.length})</TabsTrigger></TabsList>

        <TabsContent value="paket">
          <Card>
            <CardHeader><CardTitle>Paket Tes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Nama</TableHead>
                    <TableHead className={head}>Jenis</TableHead>
                    <TableHead className={`text-right ${head}`}>Jumlah soal</TableHead>
                    <TableHead className={`text-right ${head}`}>Durasi</TableHead>
                    <TableHead className={`text-right ${head}`}>Passing grade</TableHead>
                    <TableHead className={head}>Dipakai di lowongan</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    <TableHead className={`text-right ${head}`}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAKET.map((p) => (
                    <TableRow key={p.id} className="h-12 hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap font-medium">{p.nama}</TableCell>
                      <TableCell className="whitespace-nowrap">{KIND_LABEL[p.jenis]}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.jenis === 'online' ? p.soal.length : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.durasi ? `${p.durasi} menit` : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.passing ?? 'Rekomendasi'}</TableCell>
                      <TableCell className="text-sm"><span title={usedBy(p.id).map((j) => j.no).join(', ')} className="tabular-nums">{usedBy(p.id).length} lowongan</span></TableCell>
                      <TableCell><StatusBadge variant={p.status === 'Aktif' ? 'success' : 'neutral'}>{p.status}</StatusBadge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setPaketSheet({ paket: p, ro: !admin })}>{admin ? 'Ubah' : 'Lihat Detail'}</DropdownMenuItem>
                            {admin && (usedBy(p.id).length === 0 || p.status === 'Nonaktif') && (
                              <DropdownMenuItem onSelect={() => { savePaket({ ...p, status: p.status === 'Aktif' ? 'Nonaktif' : 'Aktif' }); toast.success(`${p.nama} ${p.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}`) }}>{p.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="pt-4 text-sm text-muted-foreground">Menampilkan {PAKET.length} dari {PAKET.length} data</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hasil">
          <Card>
            <CardHeader><CardTitle>Hasil Tes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari kandidat" placeholder="Cari nama atau nomor lamaran…" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
                </div>
                <Select value={fPaket} onValueChange={(v) => { setFPaket(v); setPage(1) }}>
                  <SelectTrigger aria-label="Paket" className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={ALL}>Semua Paket</SelectItem>{PAKET.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={fStatus} onValueChange={(v) => { setFStatus(v); setPage(1) }}>
                  <SelectTrigger aria-label="Status" className="w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={ALL}>Semua Status</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" disabled={!q && fPaket === ALL && fStatus === ALL} onClick={() => { setQ(''); setFPaket(ALL); setFStatus(ALL); setPage(1) }}>Reset</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Kandidat</TableHead>
                    <TableHead className={head}>Paket</TableHead>
                    <TableHead className={head}>Jadwal</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    <TableHead className={`text-right ${head}`}>Nilai / rekomendasi</TableHead>
                    <TableHead className={head}>Lulus?</TableHead>
                    <TableHead className={`text-right ${head}`}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada hasil tes yang sesuai dengan filter.</TableCell></TableRow>}
                  {rows.map((a) => {
                    const c = candidateOf(a.kandidatId)
                    const st = effTestStatus(a)
                    return (
                      <TableRow key={a.id} className="h-12 hover:bg-muted/50">
                        <TableCell><div className="flex flex-col leading-tight"><span className="whitespace-nowrap font-medium">{c?.nama}</span><span className="text-xs text-muted-foreground tabular-nums">{a.kandidatId}</span></div></TableCell>
                        <TableCell className="whitespace-nowrap">{paketOf(a.paketId)?.nama}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDate(a.jadwal)}</TableCell>
                        <TableCell><TestBadge status={st} /></TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">{nilaiCell(a)}</TableCell>
                        <TableCell><LulusBadge lulus={lulusOf(a)} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setDetail(a)}>Detail</DropdownMenuItem>
                              {admin && st !== 'Selesai' && <DropdownMenuItem onSelect={() => setScore(a)}>Input nilai</DropdownMenuItem>}
                              {admin && st !== 'Selesai' && <DropdownMenuItem onSelect={() => setResend(a)}>Kirim ulang undangan</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <PagedFooter total={hasil.length} page={page} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
          </Card>
        </TabsContent>
      </Tabs>

      {paketSheet && <PaketSheet key={paketSheet.paket?.id ?? 'new'} paket={paketSheet.paket} readOnly={paketSheet.ro} onClose={() => setPaketSheet(null)} />}
      {score && <ScoreDialog key={score.id} assign={score} onClose={() => setScore(null)} by={user.nama} />}
      {resend && <ResendDialog assign={resend} onClose={() => setResend(null)} by={user.nama} />}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (() => {
            const c = candidateOf(detail.kandidatId)
            const p = paketOf(detail.paketId)
            return (
              <>
                <DialogHeader><DialogTitle>{p?.nama}</DialogTitle><DialogDescription>{c?.nama} · {detail.kandidatId}</DialogDescription></DialogHeader>
                <dl className="space-y-2">
                  <Row label="Tahap kandidat">{c && <StageBadge stage={c.stage} />}</Row>
                  <Row label="Jadwal"><span className="tabular-nums">{formatDate(detail.jadwal)} · batas {formatDate(detail.batas)}</span></Row>
                  <Row label="Status"><TestBadge status={effTestStatus(detail)} /></Row>
                  <Row label="Nilai / rekomendasi"><span className="tabular-nums">{nilaiCell(detail)}</span></Row>
                  <Row label="Lulus?"><LulusBadge lulus={lulusOf(detail)} /></Row>
                  <Row label="Tautan tes">Tautan tes dikirim ke {detail.dikirimKe}</Row>
                  {detail.laporan && <Row label="Laporan">{detail.laporan.name}</Row>}
                  {detail.diinput && <Row label="Diinput">{detail.diinput.by}, {formatDate(detail.diinput.at)} ({detail.diinput.mode === 'manual' ? 'manual' : 'portal'})</Row>}
                </dl>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { const id = detail.kandidatId; setDetail(null); onOpenCandidate(id) }}>Buka Kandidat</Button>
                  <Button onClick={() => setDetail(null)}>Tutup</Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { can } from '@/lib/access'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AlasanField, ReviewSheet } from '@/components/koperasi/shared'
import { JobSheet } from '@/components/recruitment/job-sheet'
import { PagedFooter, pageSlice } from '@/components/recruitment/pager'
import { JobBadge, Row, SHEET_RECRUIT, StageBadge } from '@/components/recruitment/shared'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CANDIDATES } from '@/data/candidates'
import { approveJob, closeJob, closeReason, effJob, JOBS, rejectJob, submitJob, terisi, type Job, type JobStatus } from '@/data/recruitment/jobs'
import { useRecruitment } from '@/data/recruitment/store'
import { paketOf } from '@/data/recruitment/tests'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

const ALL = 'all'
const head = 'text-xs font-medium text-muted-foreground'
const STATUSES: JobStatus[] = ['Draft', 'Menunggu Approval', 'Dibuka', 'Ditutup']

export default function RecruitmentJobsPage({ user, onOpenCandidate }: { user: CurrentUser; onOpenCandidate: (id: string) => void }) {
  useRecruitment()
  const admin = can(user, 'recruitment.manage')
  const manager = user.role === 'manager'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [form, setForm] = useState<{ job?: Job } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [review, setReview] = useState<string | null>(null)
  const [closing, setClosing] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')

  const list = JOBS.filter((j) => status === ALL || effJob(j) === status).filter((j) => !q.trim() || `${j.no} ${j.posisi} ${j.dept}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => b.no.localeCompare(a.no))
  const rows = pageSlice(list, page, perPage)
  const detailJob = JOBS.find((j) => j.no === detail)
  const reviewJob = JOBS.find((j) => j.no === review)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lowongan</h1>
          <p className="text-sm text-muted-foreground">Kebutuhan tenaga kerja yang dibuka untuk rekrutmen. Lowongan ditutup otomatis bila kuota terpenuhi atau tanggal tutup terlewati.</p>
        </div>
        {admin && <Button onClick={() => setForm({})}><Plus className="size-4" />Buat Lowongan</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Lowongan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari lowongan" placeholder="Cari nomor, posisi, atau department…" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger aria-label="Status" className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Semua Status</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" disabled={!q && status === ALL} onClick={() => { setQ(''); setStatus(ALL); setPage(1) }}>Reset</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>No.</TableHead>
                <TableHead className={head}>Posisi · Department</TableHead>
                <TableHead className={`text-right ${head}`}>Kebutuhan</TableHead>
                <TableHead className={head}>Jenis & Status Kerja</TableHead>
                <TableHead className={head}>Periode buka</TableHead>
                <TableHead className={head}>Paket tes</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">Tidak ada lowongan yang sesuai dengan filter.</TableCell></TableRow>}
              {rows.map((j) => {
                const st = effJob(j)
                return (
                  <TableRow key={j.no} className="h-12 hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap font-medium tabular-nums">{j.no}</TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight"><span className="whitespace-nowrap font-medium">{j.posisi}</span><span className="text-xs text-muted-foreground">{j.dept}</span></div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">terisi {terisi(j)} / {j.kebutuhan}</TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight"><span className="whitespace-nowrap">{j.jenis} · {j.statusKerja}</span>{j.statusKerja === 'Kontrak' && <span className="text-xs text-muted-foreground">{j.durasi} bulan</span>}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatDate(j.buka)} – {formatDate(j.tutup)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs leading-tight text-muted-foreground" title={j.paketIds.map((p) => paketOf(p)?.nama).join(', ')}>
                        {j.paketIds.slice(0, 2).map((p) => <span key={p} className="whitespace-nowrap">{paketOf(p)?.nama.replace(/^Tes /, '')}</span>)}
                        {j.paketIds.length > 2 && <span>+{j.paketIds.length - 2} paket</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1"><JobBadge status={st} />{closeReason(j) && <span className="text-xs text-muted-foreground">{closeReason(j)}</span>}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDetail(j.no)}>Detail</DropdownMenuItem>
                          {manager && st === 'Menunggu Approval' && <DropdownMenuItem onSelect={() => setReview(j.no)}>Tinjau</DropdownMenuItem>}
                          {admin && st === 'Draft' && <DropdownMenuItem onSelect={() => setForm({ job: j })}>Ubah</DropdownMenuItem>}
                          {admin && st === 'Draft' && <DropdownMenuItem onSelect={() => { submitJob(j.no, user.nama); toast.success(`${j.no} diajukan ke HR & GA Manager`) }}>Ajukan</DropdownMenuItem>}
                          {admin && st === 'Dibuka' && (<><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => { setAlasan(''); setErr(''); setClosing(j.no) }}>Tutup Lowongan</DropdownMenuItem></>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <PagedFooter total={list.length} page={page} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
      </Card>

      {form && <JobSheet key={form.job?.no ?? 'new'} job={form.job} onClose={() => setForm(null)} by={user.nama} />}

      <Sheet open={!!detailJob} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className={SHEET_RECRUIT}>
          {detailJob && (
            <>
              <SheetHeader className="border-b p-6 pr-12">
                <SheetTitle>{detailJob.posisi} · {detailJob.no}</SheetTitle>
                <SheetDescription>{detailJob.dept} · {detailJob.level} · {detailJob.grade}</SheetDescription>
                <div className="pt-1"><JobBadge status={effJob(detailJob)} /></div>
              </SheetHeader>
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <JobSummary job={detailJob} />
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Kandidat ({CANDIDATES.filter((c) => c.lowonganId === detailJob.no).length})</h3>
                  <ul className="space-y-2">
                    {CANDIDATES.filter((c) => c.lowonganId === detailJob.no).map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => onOpenCandidate(c.id)} className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.nama}</span><span className="block text-xs text-muted-foreground tabular-nums">{c.id}</span></span>
                          <StageBadge stage={c.stage} />
                        </button>
                      </li>
                    ))}
                    {CANDIDATES.every((c) => c.lowonganId !== detailJob.no) && <li className="text-sm text-muted-foreground">Belum ada kandidat.</li>}
                  </ul>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {reviewJob && (
        <ReviewSheet
          open
          onOpenChange={(o) => !o && setReview(null)}
          title="Tinjau Lowongan"
          description={`${reviewJob.no} · ${reviewJob.posisi}`}
          diajukan={reviewJob.diajukan?.at ?? reviewJob.dibuat.at}
          oleh={reviewJob.diajukan?.by ?? reviewJob.dibuat.by}
          note={null}
          rejectTitle="Tolak lowongan?"
          onApprove={() => { approveJob(reviewJob.no, user.nama); toast.success(`${reviewJob.no} disetujui dan dibuka`); setReview(null) }}
          onReject={(a) => { rejectJob(reviewJob.no, user.nama, a); toast.success(`${reviewJob.no} dikembalikan ke Draft`); setReview(null) }}
        >
          <JobSummary job={reviewJob} />
        </ReviewSheet>
      )}

      <AlertDialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tutup lowongan {closing}?</AlertDialogTitle>
            <AlertDialogDescription>Lowongan tidak lagi tampil di Form DICAP. Kandidat yang sedang diproses tidak terpengaruh.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="lw-tutup-alasan" label="Alasan menutup" value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => {
              if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
              if (closing) closeJob(closing, user.nama, alasan.trim())
              toast.success('Lowongan ditutup')
              setClosing(null)
            }}>Tutup Lowongan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function JobSummary({ job }: { job: Job }) {
  return (
    <dl className="space-y-2">
      <Row label="Kebutuhan"><span className="tabular-nums">terisi {terisi(job)} / {job.kebutuhan}</span></Row>
      <Row label="Jenis & Status">{job.jenis} · {job.statusKerja}{job.statusKerja === 'Kontrak' ? ` ${job.durasi} bulan` : ''}</Row>
      <Row label="Periode buka"><span className="tabular-nums">{formatDate(job.buka)} – {formatDate(job.tutup)}</span></Row>
      <Row label="Pendidikan minimal">{job.syarat.pendidikan}</Row>
      <Row label="Usia maksimal">{job.syarat.usiaMax} tahun</Row>
      <Row label="Pengalaman">{job.syarat.pengalaman || '—'}</Row>
      {job.syarat.catatan && <Row label="Catatan">{job.syarat.catatan}</Row>}
      <Row label="Paket tes">{job.paketIds.map((p) => paketOf(p)?.nama).join(', ')}</Row>
      <Row label="Sumber">{job.sumber.join(', ')}</Row>
      {job.ditolak && <Row label="Dikembalikan">{job.ditolak.by}: {job.ditolak.alasan}</Row>}
      {job.ditutup && <Row label="Ditutup">{job.ditutup.by}: {job.ditutup.alasan}</Row>}
    </dl>
  )
}

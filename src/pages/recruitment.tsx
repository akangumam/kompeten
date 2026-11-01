import { can } from '@/lib/access'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileCheck, MoreHorizontal, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { CandidateSheet, type CandidateActions } from '@/components/recruitment/candidate-sheet'
import { CloseDialog } from '@/components/recruitment/close-dialog'
import { StageBadge } from '@/components/recruitment/shared'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { avg, CANDIDATES, initials, isFinalStage, STAGES, type Stage } from '@/data/candidates'
import { sumberLamaran } from '@/data/master/recruitment'
import { atasanDept, markGenerated, visibleToAtasan } from '@/data/recruitment/flow'
import { jobOf } from '@/data/recruitment/jobs'
import { useRecruitment } from '@/data/recruitment/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const ALL = 'all'
const GAGAL = 'gagal'
const headCls = 'text-xs font-medium text-muted-foreground'
const TABS: { id: string; label: string; match: (s: Stage) => boolean }[] = [
  ...STAGES.filter((s) => s !== 'Ditolak' && s !== 'Batal').map((s) => ({ id: s, label: s, match: (x: Stage) => x === s })),
  { id: GAGAL, label: 'Ditolak/Batal', match: (x: Stage) => x === 'Ditolak' || x === 'Batal' },
]

type Props = {
  user: CurrentUser
  onOpenDraft: (id: string) => void
  onOpenForm: () => void
  initialSelectedId?: string | null
}

export default function RecruitmentPage({ user, onOpenDraft, onOpenForm, initialSelectedId = null }: Props) {
  useRecruitment()
  const admin = can(user, 'recruitment.manage')
  const spv = user.role === 'supervisor'
  const [tab, setTab] = useState<string>(ALL)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [posisi, setPosisi] = useState(ALL)
  const [sumber, setSumber] = useState(ALL)
  const [sortDesc, setSortDesc] = useState(true)
  const [perPage, setPerPage] = useState(5)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [pending, setPending] = useState<{ type: 'reject' | 'generate'; id: string } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [tab, query, posisi, sumber, perPage, sortDesc])

  const dept = atasanDept()
  // Atasan hanya melihat kandidat departmentnya sejak tahap Interview.
  const base = spv ? CANDIDATES.filter((c) => visibleToAtasan(c, dept)) : [...CANDIDATES]
  const positions = [...new Set(base.map((c) => c.posisi))].sort()
  const counts: Record<string, number> = { [ALL]: base.length }
  for (const t of TABS) counts[t.id] = base.filter((c) => t.match(c.stage)).length

  const filtered = (() => {
    const q = query.toLowerCase()
    const t = TABS.find((x) => x.id === tab)
    return base
      .filter((c) => !t || t.match(c.stage))
      .filter((c) => posisi === ALL || c.posisi === posisi)
      .filter((c) => sumber === ALL || c.sumber === sumber)
      .filter((c) => !q || c.nama.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .sort((a, b) => (sortDesc ? b.applyDate.localeCompare(a.applyDate) || b.id.localeCompare(a.id) : a.applyDate.localeCompare(b.applyDate) || a.id.localeCompare(b.id)))
  })()

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const rows = filtered.slice(start, start + perPage)
  const filterActive = searchInput !== '' || posisi !== ALL || sumber !== ALL
  const tabLabel = TABS.find((t) => t.id === tab)?.label
  const summary =
    `Menampilkan ${filtered.length} kandidat ${tab === ALL ? 'semua tahap' : `tahap ${tabLabel}`} untuk ` +
    `${posisi === ALL ? 'semua posisi' : `posisi ${posisi}`}` +
    `${sumber === ALL ? '' : ` dari sumber ${sumber}`}` +
    `${query ? ` dengan kata kunci “${query}”` : ''} periode Oktober 2026.`

  const selected = CANDIDATES.find((c) => c.id === selectedId) ?? null
  const pendingCandidate = CANDIDATES.find((c) => c.id === pending?.id) ?? null

  const actions: CandidateActions = {
    onGenerate: (c) => setPending({ type: 'generate', id: c.id }),
    onOpenDraft: (c) => onOpenDraft(c.id),
  }
  const confirmGenerate = () => {
    if (!pendingCandidate || pendingCandidate.draftCreatedAt) return
    const id = pendingCandidate.id
    markGenerated(id)
    toast.success('Draft Pegawai berhasil dibuat', { action: { label: 'Buka Draft', onClick: () => onOpenDraft(id) } })
  }
  const reset = () => { setSearchInput(''); setQuery(''); setPosisi(ALL); setSumber(ALL) }
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Kelola kandidat dari seleksi administrasi hingga konversi ke Draft Pegawai</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="okt-2026">
            <SelectTrigger aria-label="Periode" className="min-w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="okt-2026">Oktober 2026</SelectItem></SelectContent>
          </Select>
          {admin && <Button onClick={onOpenForm}><UserPlus className="size-4" />Tambah Kandidat</Button>}
        </div>
      </div>
      {spv && <p className="text-sm text-muted-foreground">Menampilkan tim Anda: {dept} · kandidat sejak tahap Interview</p>}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value={ALL}>Semua ({counts[ALL]})</TabsTrigger>
          {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label} ({counts[t.id]})</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Daftar Kandidat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari kandidat" placeholder="Cari nama atau nomor lamaran…" className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <Select value={posisi} onValueChange={setPosisi}>
              <SelectTrigger aria-label="Posisi" className="w-[210px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Posisi</SelectItem>
                {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sumber} onValueChange={setSumber}>
              <SelectTrigger aria-label="Sumber" className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Sumber</SelectItem>
                {sumberLamaran().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!filterActive} onClick={reset}>Reset</Button>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">{summary}</p>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 bg-card ${headCls}`}>Kandidat</TableHead>
                <TableHead className={headCls}>Posisi · Lowongan</TableHead>
                <TableHead className={headCls}>Sumber</TableHead>
                <TableHead className={headCls} aria-sort={sortDesc ? 'descending' : 'ascending'}>
                  <button type="button" onClick={() => setSortDesc((v) => !v)} className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    Tanggal Apply
                    {sortDesc ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
                  </button>
                </TableHead>
                <TableHead className={headCls}>Tahap</TableHead>
                <TableHead className={`text-right ${headCls}`}>Nilai</TableHead>
                <TableHead className={`text-right ${headCls}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada kandidat yang sesuai dengan filter.</TableCell></TableRow>
              )}
              {rows.map((c) => {
                const score = avg(c)
                return (
                  <TableRow
                    key={c.id}
                    tabIndex={0}
                    onClick={() => setSelectedId(c.id)}
                    onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') setSelectedId(c.id) }}
                    className="group h-12 cursor-pointer outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8"><AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(c.nama)}</AvatarFallback></Avatar>
                        <div className="flex flex-col leading-tight">
                          <span className="whitespace-nowrap font-medium">{c.nama}{c.deleteRequest && <span className="ml-1 inline-flex items-center rounded-full border border-danger/20 bg-danger/10 px-1.5 py-px text-xs font-medium text-danger">Minta hapus data</span>}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{c.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="whitespace-nowrap font-medium">{c.posisi}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{jobOf(c.lowonganId)?.no} · {c.dept}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{c.sumber}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(c.applyDate)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StageBadge stage={c.stage} />
                        {c.draftCreatedAt && <StatusBadge variant="neutral"><FileCheck aria-hidden />Draft dibuat</StatusBadge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{score ?? '—'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setSelectedId(c.id)}>Lihat Detail</DropdownMenuItem>
                          {!spv && <DropdownMenuItem onSelect={() => toast(`Mengunduh CV ${c.nama}…`)}>Unduh CV</DropdownMenuItem>}
                          {admin && !isFinalStage(c.stage) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => setPending({ type: 'reject', id: c.id })}>Tolak</DropdownMenuItem>
                            </>
                          )}
                          {admin && c.stage === 'Diterima' && (
                            <>
                              <DropdownMenuSeparator />
                              {c.draftCreatedAt ? (
                                <DropdownMenuItem onSelect={() => actions.onOpenDraft(c)}>Buka Draft Pegawai</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => actions.onGenerate(c)}>Generate Data Pegawai</DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground tabular-nums">Menampilkan {filtered.length === 0 ? 0 : start + 1} - {Math.min(start + perPage, filtered.length)} dari {filtered.length} data</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Baris per halaman</span>
              <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                <SelectTrigger aria-label="Baris per halaman" className="w-[72px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink href="#" aria-label="Halaman sebelumnya" aria-disabled={current === 1} className={current === 1 ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); setPage(current - 1) }}><ChevronLeft className="size-4" /></PaginationLink>
                </PaginationItem>
                {pageNumbers.map((n) => (
                  <PaginationItem key={n}><PaginationLink href="#" isActive={n === current} onClick={(e) => { e.preventDefault(); setPage(n) }}>{n}</PaginationLink></PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationLink href="#" aria-label="Halaman berikutnya" aria-disabled={current === totalPages} className={current === totalPages ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); setPage(current + 1) }}><ChevronRight className="size-4" /></PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      </Card>

      <CandidateSheet candidate={selected} onClose={() => setSelectedId(null)} user={user} actions={actions} />
      <CloseDialog cand={pending?.type === 'reject' ? pendingCandidate : null} kind="Ditolak" by={user.nama} onClose={() => setPending(null)} />

      <AlertDialog open={pending?.type === 'generate'} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Data Pegawai untuk {pendingCandidate?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>Biodata, KTP, kontak, pendidikan, dan penawaran yang disetujui (posisi, level, grade, gaji, status kerja, tanggal mulai, kontrak) akan disalin ke Draft Pegawai. Data tidak perlu diketik ulang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>Generate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import {
  BadgeCheck,
  CalendarClock,
  Download,
  FileClock,
  Search,
  UserPlus,
  Users,
  X,
  Hourglass,
} from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { DirectoryHeader, DraftRow, EmployeeRow, ExitedRow, type Sort, type SortKey } from '@/components/employees/directory-rows'
import { summarize } from '@/components/employees/summary'
import { MetricCard } from '@/components/dashboard/metric-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Candidate } from '@/data/candidates'
import {
  ALL,
  buildDirectory,
  DEFAULT_FILTERS,
  directoryCsv,
  exportFilename,
  filterRows,
  hasActiveFilter,
  isKontrak45,
  scopeRows,
  tenureMonths,
  TAB_STATUS,
  TABS,
  teamOf,
  type DirFilters,
  type DirRef,
  type DirRow,
  type DirTab,
} from '@/data/directory'
import { departments, levels, sectionNames, STATUS_KERJA, type DraftRecord } from '@/data/employees'
import { JENIS_LIST } from '@/data/master/jenis'
import { KELOMPOK_LIST } from '@/data/master/levels'
import { POLA_DEFS, SHIFT_DEFS } from '@/data/master/shifts'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import type { LeaveRequest } from '@/data/leave'
import { TrxCreateSheet } from '@/components/transactions/create-sheet'
import { useTrx, type TrxJenis } from '@/data/transactions'

const TAB_LABEL: Record<DirTab, string> = { aktif: 'Aktif', bergabung: 'Akan Bergabung', draft: 'Draft', nonaktif: 'Nonaktif' }
const compare = (a: DirRow, b: DirRow, key: SortKey) => {
  switch (key) {
    case 'nik':
      return a.nik.localeCompare(b.nik)
    case 'masuk':
      return (a.tanggalMasuk || '9999').localeCompare(b.tanggalMasuk || '9999')
    case 'masa':
      // Masa kerja lebih lama = tanggal masuk lebih awal; yang belum bergabung (null) selalu di ujung.
      return (tenureMonths(a.tanggalMasuk) ?? -1) - (tenureMonths(b.tanggalMasuk) ?? -1)
    default:
      return a.nama.localeCompare(b.nama, 'id')
  }
}

type Props = {
  user: CurrentUser
  leaves: LeaveRequest[]
  candidates: Candidate[]
  drafts: Record<string, DraftRecord>
  filters: DirFilters
  setFilters: React.Dispatch<React.SetStateAction<DirFilters>>
  onOpen: (ref: DirRef) => void
  onGenerate: (id: string) => void
  onCreateDirect: () => void
}

export default function EmployeesPage({ user, leaves, candidates, drafts, filters, setFilters, onOpen, onGenerate, onCreateDirect }: Props) {
  const trxVersion = useTrx()
  const [trxCreate, setTrxCreate] = useState<{ jenis?: TrxJenis; nik?: string } | null>(null)
  const isSpv = user.role === 'supervisor'
  const canAdd = user.role === 'admin'
  const canExport = !isSpv
  const [searchInput, setSearchInput] = useState(filters.q)
  const [sort, setSort] = useState<Sort>({ key: 'nama', dir: 'asc' })
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [confirmCand, setConfirmCand] = useState<Candidate | null>(null)

  const patch = (p: Partial<DirFilters>) => setFilters((f) => ({ ...f, ...p }))

  // Pencarian ber-debounce 300 ms; perubahan filter dari luar (drill-down, Reset) menyinkronkan kotak cari.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchInput.trim()
      setFilters((f) => (f.q === q ? f : { ...f, q }))
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, setFilters])
  useEffect(() => {
    setSearchInput((cur) => (cur.trim() === filters.q ? cur : filters.q))
  }, [filters.q])

  const all = useMemo(() => scopeRows(buildDirectory(drafts, candidates), user), [drafts, candidates, user, trxVersion])
  const base = useMemo(() => filterRows(all, filters), [all, filters])
  const tabs = isSpv ? TABS.filter((t) => t === 'aktif' || t === 'bergabung') : user.role === 'payroll' ? TABS.filter((t) => t !== 'draft') : TABS
  const tab = tabs.includes(filters.tab) ? filters.tab : 'aktif'
  const counts = useMemo(() => {
    const m = {} as Record<DirTab, number>
    for (const t of TABS) m[t] = base.filter((r) => r.status === TAB_STATUS[t]).length
    return m
  }, [base])

  const rows = useMemo(() => {
    const list = base.filter((r) => r.status === TAB_STATUS[tab])
    const s = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => s * compare(a, b, sort.key) || a.nama.localeCompare(b.nama, 'id'))
  }, [base, tab, sort])

  // KPI mengikuti ruang lingkup peran, bukan filter tabel.
  const kpi = useMemo(() => {
    const act = all.filter((r) => r.status === 'Aktif')
    return {
      aktif: act.length,
      tetap: act.filter((r) => r.statusKerja === 'Tetap').length,
      pkwt: act.filter((r) => r.statusKerja === 'Kontrak').length,
      kontrak: act.filter(isKontrak45).length,
    }
  }, [all])

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const pageRows = rows.slice(start, start + perPage)

  useEffect(() => setPage(1), [filters, perPage, sort])
  useEffect(() => setSelected(new Set()), [filters])

  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const toggleRow = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })
  const togglePage = (on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      pageRows.forEach((r) => (on ? n.add(r.id) : n.delete(r.id)))
      return n
    })

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const reset = () => {
    setSearchInput('')
    setFilters((f) => ({ ...DEFAULT_FILTERS, tab: f.tab }))
  }
  const apply = (p: Partial<DirFilters>) => {
    setSearchInput('')
    setFilters({ ...DEFAULT_FILTERS, ...p })
  }

  const exportCsv = () => {
    const out = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows
    const blob = new Blob(['\uFEFF', directoryCsv(out)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`${out.length.toLocaleString('id-ID')} pegawai diekspor`)
  }

  const team = isSpv ? teamOf(user) : null
  const kontrakInResult = rows.filter(isKontrak45).length
  const acceptedNoDraft = candidates.filter((c) => c.stage === 'Diterima' && !c.draftCreatedAt)
  const extraChips: { key: keyof DirFilters['extra']; label: string }[] = []
  const x = filters.extra
  if (x.divisi) extraChips.push({ key: 'divisi', label: `Divisi: ${x.divisi}` })
  if (x.posisi) extraChips.push({ key: 'posisi', label: `Posisi: ${x.posisi}` })
  if (x.grade) extraChips.push({ key: 'grade', label: `Grade: ${x.grade}` })
  if (x.shift) extraChips.push({ key: 'shift', label: `Shift: ${SHIFT_DEFS.find((s) => s.id === x.shift)?.nama ?? x.shift}` })
  if (x.pola) extraChips.push({ key: 'pola', label: `Pola kerja: ${POLA_DEFS.find((p) => p.hari === x.pola)?.nama.split(' (')[0] ?? x.pola}` })

  const soon = () => toast.info('Dibuat di tahap berikutnya')
  const cols = tab === 'draft' || tab === 'nonaktif' ? 6 : canExport ? 10 : 9

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Direktori Pegawai</h1>
          <p className="text-sm text-muted-foreground">Seluruh pegawai PT Primaplast Indonesia beserta draft dan riwayat keluar</p>
        </div>
        {(canExport || canAdd) && (
          <div className="flex flex-wrap items-center gap-2">
            {canExport && (
              <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download /> Export
              </Button>
            )}
            {canAdd && (
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus /> Tambah Pegawai
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pegawai Aktif"
          value={kpi.aktif.toLocaleString('id-ID')}
          icon={Users}
          iconClass="text-success"
          delta={`Per ${formatDate(DEMO_TODAY)}`}
          tone="success"
          active={tab === 'aktif' && filters.statusKerja === ALL && !filters.kontrak45}
          onClick={() => apply({ tab: 'aktif' })}
        />
        <MetricCard
          label="Tetap"
          value={kpi.tetap.toLocaleString('id-ID')}
          icon={BadgeCheck}
          iconClass="text-info"
          delta={`${kpi.aktif ? Math.round((kpi.tetap / kpi.aktif) * 100) : 0}% dari pegawai aktif`}
          tone="info"
          active={filters.statusKerja === 'Tetap'}
          onClick={() => apply({ tab: 'aktif', statusKerja: 'Tetap' })}
        />
        <MetricCard
          label="Kontrak"
          value={kpi.pkwt.toLocaleString('id-ID')}
          icon={FileClock}
          iconClass="text-info"
          delta={`${kpi.aktif ? Math.round((kpi.pkwt / kpi.aktif) * 100) : 0}% dari pegawai aktif`}
          tone="info"
          active={filters.statusKerja === 'Kontrak' && !filters.kontrak45}
          onClick={() => apply({ tab: 'aktif', statusKerja: 'Kontrak' })}
        />
        <MetricCard
          label="Kontrak ≤ 45 hari"
          value={kpi.kontrak.toLocaleString('id-ID')}
          icon={CalendarClock}
          iconClass="text-warning"
          delta="Perlu ditindaklanjuti"
          tone="warning"
          active={filters.kontrak45}
          onClick={() => apply({ tab: 'aktif', kontrak45: true })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pegawai</CardTitle>
          <CardDescription>{team ? `Menampilkan tim Anda: ${team.department} · ${team.section}` : 'Cari, saring, dan buka profil pegawai'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => patch({ tab: v as DirTab })}>
            <TabsList className="h-auto max-w-full flex-wrap justify-start">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABEL[t]} ({counts[t].toLocaleString('id-ID')})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full shrink-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                aria-label="Cari pegawai"
                placeholder="Cari nama atau NIP…"
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {!isSpv && (
              <>
                <Select value={filters.department} onValueChange={(v) => patch({ department: v, section: ALL })}>
                  <SelectTrigger aria-label="Department" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Department</SelectItem>
                    {departments().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.section} onValueChange={(v) => patch({ section: v })} disabled={filters.department === ALL}>
                  <SelectTrigger aria-label="Section" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Section</SelectItem>
                    {(filters.department === ALL ? [] : sectionNames(filters.department)).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Select value={filters.jenis} onValueChange={(v) => patch({ jenis: v })}>
              <SelectTrigger aria-label="Jenis Karyawan" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Jenis</SelectItem>
                {JENIS_LIST.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.statusKerja} onValueChange={(v) => patch({ statusKerja: v })}>
              <SelectTrigger aria-label="Status Kerja" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Status</SelectItem>
                {STATUS_KERJA.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.kelompok} onValueChange={(v) => patch({ kelompok: v })}>
              <SelectTrigger aria-label="Group Kerja" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Group</SelectItem>
                {KELOMPOK_LIST.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.level} onValueChange={(v) => patch({ level: v })}>
              <SelectTrigger aria-label="Level" className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Level</SelectItem>
                {levels().map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  aria-pressed={filters.kontrak45}
                  aria-label="Kontrak ≤ 45 hari"
                  onClick={() => patch({ kontrak45: !filters.kontrak45 })}
                  className={cn('shrink-0', filters.kontrak45 && 'border-ring bg-accent')}
                >
                  <CalendarClock /> <span className="2xl:inline xl:hidden">≤ 45 hari</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kontrak berakhir ≤ 45 hari</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  aria-pressed={filters.pensiun}
                  aria-label="Mendekati pensiun (≤ 6 bulan)"
                  onClick={() => patch({ pensiun: !filters.pensiun })}
                  className={cn('shrink-0', filters.pensiun && 'border-ring bg-accent')}
                >
                  <Hourglass /> <span className="2xl:inline xl:hidden">Mendekati pensiun (≤ 6 bulan)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tanggal lahir + usia pensiun jatuh dalam 6 bulan ke depan</TooltipContent>
            </Tooltip>
            <Button variant="outline" className="shrink-0" disabled={!hasActiveFilter(filters)} onClick={reset}>Reset</Button>
          </div>

          {extraChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter dari Data Master:</span>
              {extraChips.map((c) => (
                <Button
                  key={c.key}
                  variant="secondary"
                  size="sm"
                  aria-label={`Hapus filter ${c.label}`}
                  onClick={() => setFilters((f) => ({ ...f, extra: { ...f.extra, [c.key]: undefined } }))}
                >
                  {c.label} <X />
                </Button>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {summarize({ ...filters, tab }, rows.length, kontrakInResult)}
            {selected.size > 0 && <span className="ml-2 font-medium text-foreground">{selected.size} dipilih untuk Export.</span>}
          </p>

          <Table>
            <TableHeader>
              <DirectoryHeader
                tab={tab}
                canSelect={canExport}
                sort={sort}
                onSort={toggleSort}
                pageAllSelected={pageAllSelected}
                onTogglePage={togglePage}
              />
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={cols} className="h-28 text-center text-sm text-muted-foreground">
                    Tidak ada pegawai yang sesuai filter.
                    {hasActiveFilter(filters) && (
                      <Button variant="link" className="ml-1 h-auto p-0" onClick={reset}>Reset filter</Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r) => {
                const open = () => onOpen(r.ref)
                if (r.status === 'Draft') return <DraftRow key={r.id} r={r} open={open} />
                if (r.status === 'Nonaktif') return <ExitedRow key={r.id} r={r} open={open} onTransact={soon} />
                return (
                  <EmployeeRow
                    key={r.id}
                    r={r}
                    open={open}
                    canSelect={canExport}
                    selected={selected.has(r.id)}
                    onSelect={(on) => toggleRow(r.id, on)}
                    canTransact={canAdd}
                    onTransact={() => setTrxCreate({ nik: r.nik })}
                  />
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={rows.length} start={start} perPage={perPage} current={current} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
      </Card>

      <TrxCreateSheet open={trxCreate !== null} onOpenChange={(o) => !o && setTrxCreate(null)} user={user} leaves={leaves} initial={trxCreate ?? undefined} />

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        candidates={acceptedNoDraft}
        onPickCandidate={(c) => {
          setAddOpen(false)
          setConfirmCand(c)
        }}
        onDirect={() => {
          setAddOpen(false)
          onCreateDirect()
        }}
      />

      <AlertDialog open={confirmCand !== null} onOpenChange={(o) => !o && setConfirmCand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Data Pegawai untuk {confirmCand?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              Biodata, KTP, kontak, foto, dan riwayat pendidikan akan disalin ke Draft Pegawai. Data tidak perlu diketik ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmCand) onGenerate(confirmCand.id)
                setConfirmCand(null)
              }}
            >
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

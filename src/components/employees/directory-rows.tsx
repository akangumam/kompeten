import { ArrowDown, ArrowUp, ArrowUpDown, BadgeCheck, Clock, MoreHorizontal, TriangleAlert } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { contractEnding, contractPending } from '@/data/employees'
import { useDirectoryNav } from '@/lib/directory-nav'
import { atasanOfRow, formatTenure, isKontrak45, type DirRow, type DirTab } from '@/data/directory'
import { formatDate } from '@/lib/format'

export type SortKey = 'nama' | 'nik' | 'masuk' | 'masa'
export type Sort = { key: SortKey; dir: 'asc' | 'desc' }

const head = 'text-xs font-medium text-muted-foreground'
const stickyHead = `sticky left-0 z-10 bg-card ${head}`
const rowCls =
  'group h-12 cursor-pointer outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring'

/** Tanggal tanpa tahun untuk badge kontrak (selalu dalam 45 hari ke depan). */
const shortDate = (iso: string) => formatDate(iso).replace(/ \d{4}$/, '')

function NameCell({ r }: { r: DirRow }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(r.nama)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="whitespace-nowrap font-medium">{r.nama}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{r.nik || r.department || 'Belum ada NIP'}</span>
      </div>
    </div>
  )
}

const deptSection = (r: DirRow) => (
  <div className="flex flex-col leading-tight">
    <span>{r.department || '—'}</span>
    {r.section && r.section !== r.department && <span className="text-xs text-muted-foreground">{r.section}</span>}
  </div>
)

/** Baris yang bisa dibuka lewat klik atau Enter; sel aksi/checkbox menghentikan propagasi lewat `stop`. */
const rowProps = (open: () => void) => ({
  tabIndex: 0,
  onClick: open,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.target === e.currentTarget && e.key === 'Enter') open()
  },
})
const stop = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
}

function RowMenu({ open, canTransact, onTransact, onEnd }: { open: () => void; canTransact: boolean; onTransact: () => void; onEnd?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={open}>Lihat Profil</DropdownMenuItem>
        {canTransact && <DropdownMenuItem onSelect={onTransact}>Transaksi Kepegawaian</DropdownMenuItem>}
        {onEnd && <DropdownMenuItem onSelect={onEnd}>Proses Berakhir</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type HeaderProps = {
  tab: DirTab
  canSelect: boolean
  sort: Sort
  onSort: (key: SortKey) => void
  pageAllSelected: boolean
  onTogglePage: (on: boolean) => void
}

export function DirectoryHeader({ tab, canSelect, sort, onSort, pageAllSelected, onTogglePage }: HeaderProps) {
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')
  const sortButton = (key: SortKey, label: string) => {
    const Icon = sort.key !== key ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    )
  }
  const aksi = <TableHead className={`text-right ${head}`}>Aksi</TableHead>

  if (tab === 'draft')
    return (
      <TableRow className="hover:bg-transparent">
        <TableHead className={stickyHead}>Nama</TableHead>
        <TableHead className={head}>Asal</TableHead>
        <TableHead className={head}>Posisi</TableHead>
        <TableHead className={head}>Dibuat</TableHead>
        <TableHead className={head}>Kelengkapan</TableHead>
        {aksi}
      </TableRow>
    )
  if (tab === 'nonaktif')
    return (
      <TableRow className="hover:bg-transparent">
        <TableHead className={stickyHead}>Pegawai</TableHead>
        <TableHead className={head}>Department · Posisi</TableHead>
        <TableHead className={head}>Tanggal Keluar</TableHead>
        <TableHead className={head}>Alasan</TableHead>
        <TableHead className={`text-right ${head}`}>Masa Kerja</TableHead>
        {aksi}
      </TableRow>
    )
  return (
    <TableRow className="hover:bg-transparent">
      {canSelect && (
        <TableHead className="w-10">
          <Checkbox aria-label="Pilih semua pegawai di halaman ini" checked={pageAllSelected} onCheckedChange={(v) => onTogglePage(v === true)} />
        </TableHead>
      )}
      <TableHead className={stickyHead} aria-sort={sort.key === 'nik' ? ariaSort('nik') : ariaSort('nama')}>
        <span className="inline-flex items-center gap-3">
          {sortButton('nama', 'Pegawai')}
          {sortButton('nik', 'NIP')}
        </span>
      </TableHead>
      <TableHead className={head}>Department · Section</TableHead>
      <TableHead className={head}>Posisi</TableHead>
      <TableHead className={head}>Level</TableHead>
      <TableHead className={head}>Status Kerja</TableHead>
      <TableHead className={head} aria-sort={ariaSort('masuk')}>{sortButton('masuk', 'Tanggal Masuk')}</TableHead>
      <TableHead className={`text-right ${head}`} aria-sort={ariaSort('masa')}>{sortButton('masa', 'Masa Kerja')}</TableHead>
      <TableHead className={head}>Atasan</TableHead>
      {aksi}
    </TableRow>
  )
}

type RowProps = { r: DirRow; open: () => void }

export function DraftRow({ r, open }: RowProps) {
  return (
    <TableRow {...rowProps(open)} className={rowCls}>
      <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted"><NameCell r={r} /></TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">{r.asal}</TableCell>
      <TableCell>{r.posisi || '—'}</TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(r.dibuat ?? DEMO_TODAY)}</TableCell>
      <TableCell>
        {r.kosong ? (
          <StatusBadge variant="warning"><TriangleAlert aria-hidden />{r.kosong} kolom belum diisi</StatusBadge>
        ) : (
          <StatusBadge variant="success"><BadgeCheck aria-hidden />Lengkap</StatusBadge>
        )}
      </TableCell>
      <TableCell className="text-right" {...stop}>
        <Button variant="outline" size="sm" onClick={open}>Lengkapi</Button>
      </TableCell>
    </TableRow>
  )
}

export function ExitedRow({ r, open, onTransact }: RowProps & { onTransact: () => void }) {
  const k = r.keluar!
  return (
    <TableRow {...rowProps(open)} className={rowCls}>
      <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted"><NameCell r={r} /></TableCell>
      <TableCell>
        <div className="flex flex-col leading-tight">
          <span>{r.department}</span>
          <span className="text-xs text-muted-foreground">{r.posisi}</span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(k.tanggal)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusBadge variant="neutral">{k.alasan}</StatusBadge>
          {k.keterangan && <span className="max-w-[220px] text-xs text-muted-foreground">{k.keterangan}</span>}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatTenure(r.tanggalMasuk, k.tanggal)}</TableCell>
      <TableCell className="text-right" {...stop}>
        <RowMenu open={open} canTransact={false} onTransact={onTransact} />
      </TableCell>
    </TableRow>
  )
}

export function EmployeeRow({
  r,
  open,
  canSelect,
  selected,
  onSelect,
  canTransact,
  onTransact,
}: RowProps & { canSelect: boolean; selected: boolean; onSelect: (on: boolean) => void; canTransact: boolean; onTransact: () => void }) {
  const nav = useDirectoryNav()
  return (
    <TableRow data-state={selected ? 'selected' : undefined} {...rowProps(open)} className={`${rowCls} data-[state=selected]:bg-muted`}>
      {canSelect && (
        <TableCell {...stop}>
          <Checkbox aria-label={`Pilih ${r.nama}`} checked={selected} onCheckedChange={(v) => onSelect(v === true)} />
        </TableCell>
      )}
      <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted group-data-[state=selected]:bg-muted"><NameCell r={r} /></TableCell>
      <TableCell className="whitespace-normal">{deptSection(r)}</TableCell>
      <TableCell className="whitespace-normal">{r.posisi}</TableCell>
      <TableCell>{r.level}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusBadge variant="neutral">{r.statusKerja}</StatusBadge>
          <span className="text-xs text-muted-foreground">{r.jenis}</span>
          {isKontrak45(r) && <StatusBadge variant="warning"><Clock aria-hidden />Berakhir {shortDate(r.tanggalAkhir)}</StatusBadge>}
          {contractPending(r.nik) && <StatusBadge variant="info">{contractPending(r.nik)}</StatusBadge>}
          {contractEnding(r.nik) && <StatusBadge variant="warning">{contractEnding(r.nik) === 'diproses' ? 'Berakhir diproses' : 'Pengakhiran diajukan'}</StatusBadge>}
          {r.terjadwalNonaktif && <StatusBadge variant="neutral">Terjadwal nonaktif {shortDate(r.terjadwalNonaktif)}</StatusBadge>}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(r.tanggalMasuk)}</TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatTenure(r.tanggalMasuk)}</TableCell>
      <TableCell className="whitespace-normal">{atasanOfRow(r)}</TableCell>
      <TableCell className="text-right" {...stop}>
        <RowMenu open={open} canTransact={canTransact} onTransact={onTransact} onEnd={canTransact && isKontrak45(r) && !contractEnding(r.nik) ? () => nav.openOffboarding(r.nik, 'Habis Kontrak') : undefined} />
      </TableCell>
    </TableRow>
  )
}

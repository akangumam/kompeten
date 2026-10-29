import { ArrowUpRight, Download, Info, Search, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Cell, Pie, PieChart } from 'recharts'
import type { PageId } from '@/App'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { rp } from '@/components/koperasi/shared'
import { KPI_GRID, PageHeader, StatCard, download } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { defaultPersen, finalizeShu, finalOf, persenOf, resetPersen, reportOf, savePersen, shuBlockers, shuCsv, SHU_GROUPS, SHU_YEARS } from '@/data/koperasi/shu'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const signed = (n: number) => (n < 0 ? `−${rp(Math.abs(n))}` : rp(n))
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']
const chartConfig = Object.fromEntries(SHU_GROUPS.map((g, i) => [g.key, { label: g.nama, color: COLORS[i] }])) satisfies ChartConfig

function Line({ label, sub, value, onClick, strong }: { label: string; sub?: string; value: number; onClick?: () => void; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        {onClick ? (
          <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-sm text-left underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {label}<ArrowUpRight className="size-3 text-muted-foreground" aria-hidden />
          </button>
        ) : <span className={cn(strong && 'font-semibold')}>{label}</span>}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className={cn('shrink-0 tabular-nums', strong && 'font-semibold', value < 0 && 'text-danger')}>{signed(value)}</span>
    </div>
  )
}

export default function CoopShuPage({ user, onNavigate }: { user: CurrentUser; onNavigate: (p: PageId) => void }) {
  const ver = useKoperasi()
  const isKetua = user.role === 'ketua'
  const [year, setYear] = useState(2026)
  const final = finalOf(year)
  const [draft, setDraft] = useState<Record<number, number[]>>({})
  const persen = final ? final.persen : draft[year] ?? persenOf(year)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [confirm, setConfirm] = useState(false)
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const r = useMemo(() => reportOf(year, persen), [year, persen.join(','), ver, final])
  const total = persen.reduce((a, n) => a + n, 0)
  const blockers = final ? [] : shuBlockers(year, persen, r.shu)
  const readOnly = !isKetua || !!final
  const depts = [...new Set(r.members.map((m) => m.department))].sort((a, b) => a.localeCompare(b, 'id'))
  const rows = r.members.filter((m) => (dept === 'all' || m.department === dept) && (!q || `${m.nama} ${m.nik}`.toLowerCase().includes(q.trim().toLowerCase()))).sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama, 'id'))
  const allSum = (f: (m: (typeof rows)[number]) => number) => r.members.reduce((a, m) => a + f(m), 0)
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = rows.slice(start, start + perPage)
  const penerima = r.members.filter((m) => m.total > 0).length
  const donut = SHU_GROUPS.map((g, i) => ({ key: g.key, nama: g.nama, value: r.pools[i] }))
  const setP = (i: number, v: string) => {
    const n = Math.max(0, Math.min(100, Math.round(Number(v.replace(/\D/g, '')) || 0)))
    setDraft((d) => ({ ...d, [year]: persen.map((x, j) => (j === i ? n : x)) }))
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="SHU" subtitle="Sisa Hasil Usaha per tahun buku">
        <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1) }}>
          <SelectTrigger aria-label="Tahun buku" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{SHU_YEARS.map((y) => <SelectItem key={y} value={String(y)}>Tahun buku {y}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {final ? (
          <>
            <StatusBadge variant="success">Final</StatusBadge>
            <span>Difinalisasi {final.final.oleh} · {formatDate(final.final.tanggal)}{final.final.rat ? ` · Dibagikan pada RAT ${formatDate(final.final.rat)}` : ''}</span>
          </>
        ) : (
          <>
            <StatusBadge variant="warning">Sementara</StatusBadge>
            <span>per {formatDate(DEMO_TODAY)} · berubah mengikuti transaksi</span>
          </>
        )}
      </div>
      {final && <Alert><Info /><AlertDescription className="text-muted-foreground">SHU final adalah arsip; perubahan data setelah finalisasi tidak mengubah angka ini.</AlertDescription></Alert>}
      {!isKetua && !final && <Alert variant="info"><AlertDescription>Mode baca. Persentase dan finalisasi dilakukan Ketua.</AlertDescription></Alert>}

      <div className={KPI_GRID}>
        <StatCard label="Total pendapatan" value={rp(r.pendapatan.total)} icon={Wallet} iconClass="text-success" hint={`Tahun buku ${year}`} />
        <StatCard label="Total beban" value={rp(r.bebanTotal)} icon={Wallet} hint="Pengeluaran Tercatat" />
        <StatCard label={`SHU ${final ? 'Final' : 'Sementara'}`} value={<span className={cn(r.shu < 0 && 'text-danger')}>{signed(r.shu)}</span>} icon={Wallet} iconClass={r.shu < 0 ? 'text-danger' : 'text-info'} hint="Pendapatan − beban" />
        <StatCard label="Anggota penerima" value={penerima.toLocaleString('id-ID')} icon={Users} hint="Anggota aktif dengan total SHU > 0" />
      </div>

      <Card>
        <CardHeader><CardTitle>Laporan SHU {year}</CardTitle><CardDescription>Dibaca dari buku keuangan Koperasi</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-label="Pendapatan" className="divide-y">
              <h3 className="pb-2 text-sm font-semibold">Pendapatan</h3>
              <Line label="Biaya admin kasbon (terkumpul)" value={r.pendapatan.admin} onClick={final ? undefined : () => onNavigate('coop-cash-advance')} />
              <Line
                label="Hasil Unit Dagang"
                sub={r.pendapatan.udMasuk !== undefined ? `masuk ${rp(r.pendapatan.udMasuk)} − keluar ${rp(r.pendapatan.udKeluar ?? 0)}` : 'Ringkasan tahun buku (data migrasi)'}
                value={r.pendapatan.udSelisih}
                onClick={final ? undefined : () => onNavigate('coop-trading')}
              />
              <Line label="Total pendapatan" value={r.pendapatan.total} strong />
            </section>
            <section aria-label="Beban" className="divide-y">
              <h3 className="pb-2 text-sm font-semibold">Beban</h3>
              {r.beban.map((b) => <Line key={b.kode} label={`${b.kode} ${b.nama}`} value={b.nominal} onClick={final ? undefined : () => onNavigate('coop-budget')} />)}
              <Line label="Total beban" value={r.bebanTotal} strong />
            </section>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-4">
            <span className="text-sm font-semibold">SHU {final ? 'Final' : 'Sementara'}</span>
            <span className={cn('text-3xl font-bold tabular-nums tracking-tight', r.shu < 0 && 'text-danger')} data-testid="shu-total">SHU = {signed(r.shu)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pembagian SHU</CardTitle><CardDescription>Persentase per kelompok; pool dihitung langsung dari SHU</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <ul className="divide-y">
                {SHU_GROUPS.map((g, i) => (
                  <li key={g.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{g.nama}</p>
                      <p className="text-xs text-muted-foreground">{g.basis}</p>
                    </div>
                    <div className="relative w-24">
                      <Input aria-label={`Persentase ${g.nama}`} type="number" min={0} max={100} step={1} disabled={readOnly} className="pr-7 text-right tabular-nums" value={persen[i]} onChange={(e) => setP(i, e.target.value)} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                    <span className="w-32 text-right text-sm font-medium tabular-nums" data-testid={`pool-${g.key}`}>{rp(r.pools[i])}</span>
                  </li>
                ))}
              </ul>
              <p className={cn('text-sm font-medium', total === 100 ? 'text-success' : 'text-danger')}>
                {total === 100 ? 'Total 100%' : `Total ${total}% · ${total < 100 ? 'kurang' : 'lebih'} ${Math.abs(100 - total)}%`}
              </p>
              {!final && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button variant="outline" disabled={!isKetua} onClick={() => { savePersen(year, persen); toast.success('Persentase disimpan') }}>Simpan Persentase</Button>
                  <Button variant="outline" disabled={!isKetua} onClick={() => { resetPersen(year); setDraft((d) => ({ ...d, [year]: defaultPersen() })); toast.success('Persentase dikembalikan ke default') }}>Kembalikan ke default</Button>
                  {isKetua && blockers.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild><span tabIndex={0} className="inline-flex"><Button disabled>Finalisasi SHU {year}</Button></span></TooltipTrigger>
                      <TooltipContent className="max-w-xs"><ul className="list-disc space-y-1 pl-4">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button disabled={!isKetua} onClick={() => setConfirm(true)}>Finalisasi SHU {year}</Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ChartContainer config={chartConfig} className="aspect-square h-[200px] shrink-0">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => `${chartConfig[n as keyof typeof chartConfig]?.label ?? n}: ${rp(Number(v))}`} />} />
                  <Pie data={r.shu > 0 ? donut : [{ key: 'kosong', nama: 'Belum ada pool', value: 1 }]} dataKey="value" nameKey="key" innerRadius={55} outerRadius={85} strokeWidth={2} isAnimationActive={false}>
                    {(r.shu > 0 ? donut : [{ key: 'kosong' }]).map((d, i) => <Cell key={d.key} fill={r.shu > 0 ? COLORS[i] : 'var(--muted)'} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="space-y-2 text-sm">
                {SHU_GROUPS.map((g, i) => (
                  <li key={g.key} className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: COLORS[i] }} aria-hidden /><span className="text-muted-foreground">{g.nama}</span><span className="ml-auto pl-3 font-medium tabular-nums">{rp(r.pools[i])}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rincian per anggota</CardTitle><CardDescription>{r.members.length.toLocaleString('id-ID')} anggota aktif</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Ringkasan total">
            {[...SHU_GROUPS.map((g, i) => ({ label: g.nama.replace('Jasa Anggota Meminjam', 'Jasa pinjaman').replace('Jasa Simpanan Wajib', 'Jasa wajib').replace('Jasa Simpanan Sukarela', 'Jasa sukarela'), value: allSum((m) => m.shares[i]) })), { label: 'Total', value: allSum((m) => m.total) }].map((b, i) => (
              <div key={b.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{b.label}</p>
                <p className={cn('text-base tabular-nums', i === 4 ? 'font-semibold' : 'font-medium')} data-testid={`foot-${i}`}>{rp(b.value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">Sisa pembulatan {rp(r.sisa.reduce((a, n) => a + n, 0))} (dibawa ke tahun buku berikutnya). Per kelompok: {SHU_GROUPS.map((g, i) => `${g.nama} ${rp(r.sisa[i])}`).join(' · ')}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari anggota" placeholder="Cari nama atau NIP…" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </div>
            <Select value={dept} onValueChange={(v) => { setDept(v); setPage(1) }}>
              <SelectTrigger aria-label="Department" className="min-w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Department</SelectItem>{depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="ml-auto" onClick={() => { const c = shuCsv(r); download(`shu-${year}.csv`, c); toast.success(`shu-${year}.csv diunduh`) }}><Download /> Unduh CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="max-xl:min-w-[860px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(head, 'max-xl:sticky max-xl:left-0 max-xl:z-10 max-xl:bg-card')}>Anggota</TableHead>
                  <TableHead className={`text-right ${head}`}>Jasa pinjaman</TableHead><TableHead className={`text-right ${head}`}>Jasa wajib</TableHead><TableHead className={`text-right ${head}`}>Jasa sukarela</TableHead><TableHead className={`text-right ${head}`}>Pengurus</TableHead>
                  <TableHead className={cn('text-right', head, 'max-xl:sticky max-xl:right-0 max-xl:z-10 max-xl:border-l max-xl:bg-card')}>Total SHU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((m) => (
                  <TableRow key={m.nik} className="group h-14 hover:bg-muted/50">
                    <TableCell className="max-xl:sticky max-xl:left-0 max-xl:z-10 max-xl:bg-card max-xl:group-hover:bg-muted"><div className="flex flex-col leading-tight"><span className="whitespace-nowrap font-medium">{m.nama}</span><span className="text-xs tabular-nums text-muted-foreground">{m.nik}</span></div></TableCell>
                    <TableCell className="text-right tabular-nums"><div>{rp(m.shares[0])}</div><div className="text-xs text-muted-foreground">dipinjam {rp(m.pinjam)}</div></TableCell>
                    <TableCell className="text-right tabular-nums"><div>{rp(m.shares[1])}</div><div className="text-xs text-muted-foreground">saldo {rp(m.wajib)}</div></TableCell>
                    <TableCell className="text-right tabular-nums"><div>{rp(m.shares[2])}</div><div className="text-xs text-muted-foreground">saldo {rp(m.sukarela)}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{m.shares[3] > 0 ? rp(m.shares[3]) : '—'}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums max-xl:sticky max-xl:right-0 max-xl:z-10 max-xl:border-l max-xl:bg-card max-xl:group-hover:bg-muted">{rp(m.total)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Anggota tidak ditemukan.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <DirectoryFooter total={rows.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} unit="anggota" sizes={[10, 20, 50]} />
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi SHU {year}?</AlertDialogTitle>
            <AlertDialogDescription>Hasil akan dikunci dan tidak dihitung ulang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const e = finalizeShu(year, persen, user.nama); if (e) toast.error(e); else toast.success(`SHU ${year} Final`) }}>Finalisasi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

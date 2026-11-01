import { HandCoins, Landmark, PiggyBank, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarChartGrouped, BarChartSimple, ChartCard } from '@/components/charts'
import { StatCard, num } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { budgetVsRealisasi, circulation, coopKpi, lastConfirmedPeriod, todos, udMonthly, type Cell as CircCell } from '@/data/dashboard-koperasi'
import { bulanName, periodLabel, rp } from '@/data/koperasi/loans'
import { useKoperasi } from '@/data/koperasi/store'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import type { PageId } from '@/App'

const head = 'text-xs font-medium text-muted-foreground'
const budgetConfig = { budget: { label: 'Budget', color: 'var(--chart-2)' }, realisasi: { label: 'Realisasi', color: 'var(--chart-1)' } } satisfies ChartConfig
const udConfig = { selisih: { label: 'Selisih Unit Dagang', color: 'var(--chart-1)' } } satisfies ChartConfig
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function CircCellView({ c, money = true }: { c: CircCell | null; money?: boolean }) {
  if (!c) return <span className="text-muted-foreground">—</span>
  if (c.n === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className="tabular-nums">
      {num(c.n)}{money && c.rp != null && <span className="block text-xs text-muted-foreground">{rp(c.rp)}</span>}
    </span>
  )
}

export function KoperasiTab({ bulan, onNavigate }: { bulan: string; onNavigate: (page: PageId, id?: string | null) => void }) {
  const tick = useKoperasi()
  const [mode, setMode] = useState<'bulan' | 'tahun'>('bulan')
  // Angka dibaca ulang setiap ada perubahan data Koperasi.
  const kpi = useMemo(() => coopKpi(), [tick])
  const bars = useMemo(() => budgetVsRealisasi(bulan, mode), [tick, bulan, mode])
  const ud = useMemo(() => udMonthly().map((u) => ({ ...u, label: MON[Number(u.bulan.slice(5)) - 1] })), [tick])
  const circ = useMemo(() => circulation(bulan), [tick, bulan])
  const list = useMemo(() => todos(), [tick])
  const confirmed = lastConfirmedPeriod()
  const shown = list.slice(0, 5)
  const totals = bars.reduce((a, b) => ({ budget: a.budget + b.budget, realisasi: a.realisasi + b.realisasi }), { budget: 0, realisasi: 0 })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Data per {formatDate(DEMO_TODAY)} · saldo terkonfirmasi s/d payroll {periodLabel(confirmed)}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif" icon={Users} value={num(kpi.anggota)} hint="Anggota dengan status aktif" />
        <StatCard
          label="Dana tersimpan"
          icon={PiggyBank}
          value={rp(kpi.tersimpan)}
          hint={<span className="block whitespace-nowrap tabular-nums">Pokok {rp(kpi.pokok)}<br />Wajib {rp(kpi.wajib)}<br />Sukarela {rp(kpi.sukarela)}</span>}
        />
        <StatCard
          label="Dana terutang"
          icon={HandCoins}
          value={rp(kpi.terutang)}
          hint={<span className="block whitespace-nowrap tabular-nums">Pinjaman {rp(kpi.pinjaman)}<br />Kasbon {rp(kpi.kasbon)}</span>}
        />
        <StatCard
          label="SHU berjalan"
          icon={Landmark}
          value={rp(kpi.shu)}
          hint={`${kpi.shuFinal ? 'Final' : 'Sementara'} · tahun buku ${DEMO_TODAY.slice(0, 4)}`}
          footer={<button type="button" className="font-medium text-primary underline underline-offset-4 hover:no-underline" onClick={() => onNavigate('coop-shu')}>Lihat SHU</button>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7"
          title="Budget vs Realisasi"
          description={<span className="tabular-nums">{mode === 'bulan' ? periodLabel(bulan) : `Januari – ${bulanName(bulan)} ${bulan.slice(0, 4)}`} · Budget {rp(totals.budget)} · Realisasi {rp(totals.realisasi)}</span>}
          action={
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'bulan' | 'tahun')}>
              <TabsList>
                <TabsTrigger value="bulan">Bulan ini</TabsTrigger>
                <TabsTrigger value="tahun">Tahun berjalan</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <BarChartGrouped
            data={bars}
            keys={['budget', 'realisasi']}
            categoryKey="kode"
            config={budgetConfig}
            layout="horizontal"
            valueFormatter={rp}
            labelFormatter={(_, p) => { const r = (p[0] as { payload?: { kode: string; nama: string } } | undefined)?.payload; return r ? `${r.kode} · ${r.nama}` : '' }}
            height={Math.max(220, bars.length * 78 + 40)}
          />
        </ChartCard>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>SHU berjalan {DEMO_TODAY.slice(0, 4)}</CardTitle>
            <CardDescription>Pendapatan dikurangi Beban, belum final</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="divide-y text-sm">
              <div className="flex items-baseline justify-between gap-3 py-2"><dt className="text-muted-foreground">Admin Kasbon</dt><dd className="font-medium tabular-nums">{rp(kpi.adminKasbon)}</dd></div>
              <div className="flex items-baseline justify-between gap-3 py-2"><dt className="text-muted-foreground">Selisih Unit Dagang</dt><dd className="font-medium tabular-nums">{rp(kpi.udSelisih)}</dd></div>
              <div className="flex items-baseline justify-between gap-3 py-2"><dt className="text-muted-foreground">Pendapatan</dt><dd className="font-medium tabular-nums">{rp(kpi.pendapatan)}</dd></div>
              <div className="flex items-baseline justify-between gap-3 py-2"><dt className="text-muted-foreground">Beban</dt><dd className="font-medium tabular-nums">{rp(kpi.beban)}</dd></div>
              <div className="flex items-baseline justify-between gap-3 py-2"><dt className="font-medium">SHU</dt><dd className="text-base font-semibold tabular-nums">{rp(kpi.shu)}</dd></div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Selisih Unit Dagang per bulan</p>
              <BarChartSimple data={ud} dataKey="selisih" categoryKey="label" config={udConfig} height={120} showLabels={false} valueFormatter={rp} activeCategory={MON[Number(bulan.slice(5)) - 1]} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sirkulasi transaksi {periodLabel(bulan)}</CardTitle>
          <CardDescription>Dihitung menurut tanggal pengajuan dan tanggal pencairan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Jenis</TableHead>
                  <TableHead className={head}>Diajukan</TableHead>
                  <TableHead className={head}>Disetujui</TableHead>
                  <TableHead className={head}>Dicairkan</TableHead>
                  <TableHead className={head}>Ditolak/Dibatalkan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circ.rows.map((r) => (
                  <TableRow key={r.jenis}>
                    <TableCell className="font-medium">{r.jenis}</TableCell>
                    <TableCell><CircCellView c={r.diajukan} /></TableCell>
                    <TableCell><CircCellView c={r.disetujui} /></TableCell>
                    <TableCell><CircCellView c={r.dicairkan} /></TableCell>
                    <TableCell><CircCellView c={r.ditolak} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="border-t pt-3 text-sm text-muted-foreground tabular-nums">
            Pinjaman Non-Koperasi aktif: <b className="text-foreground">{num(circ.nonCount)}</b> pinjaman, sisa angsuran <b className="text-foreground">{rp(circ.nonSisa)}</b>. Bukan dana Koperasi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menunggu tindakan</CardTitle>
          <CardDescription>{list.length ? `${num(list.length)} pengajuan menunggu keputusan atau pencairan` : 'Tidak ada pengajuan yang menunggu'}</CardDescription>
          {list.length > 0 && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onNavigate(list[0].page)}>Lihat semua</Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {shown.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>No.</TableHead>
                    <TableHead className={head}>Jenis</TableHead>
                    <TableHead className={head}>Anggota</TableHead>
                    <TableHead className={`text-right ${head}`}>Nominal</TableHead>
                    <TableHead className={head}>Menunggu</TableHead>
                    <TableHead className={`text-right ${head}`}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((t) => (
                    <TableRow key={t.key}>
                      <TableCell className="tabular-nums">{t.no}</TableCell>
                      <TableCell>{t.jenis}</TableCell>
                      <TableCell className="font-medium">{t.anggota}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.nominal == null ? '—' : rp(t.nominal)}</TableCell>
                      <TableCell><StatusBadge variant={t.menunggu === 'Ketua' ? 'info' : 'warning'}>{t.menunggu}</StatusBadge></TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onNavigate(t.page, t.no)}>{t.menunggu === 'Ketua' ? 'Tinjau' : 'Proses'}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="pt-3 text-sm text-muted-foreground">Menampilkan {shown.length} dari {list.length} data</p>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Semua pengajuan sudah ditindaklanjuti.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { Banknote, Paperclip, PiggyBank, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { ALASAN_ERROR } from '@/lib/validators'
import { useState } from 'react'
import { toast } from 'sonner'
import { BarChartGrouped, ChartCard } from '@/components/charts'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { AlasanField, alasanOk, MoneyField, ReviewSheet, rp, SHEET_W } from '@/components/koperasi/shared'
import { KPI_GRID, PageHeader, StatCard } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  batasPengeluaran, budgetOf, budgetStep, budgetTotal, BUDGETS, cancelPengeluaran, copyBudget, createManual, createPengeluaran, decideBudget, decidePengeluaran, editable, menunggu, PENGELUARAN,
  pkoError, realisasi, serapan, setItem, sisa, submitBudget, type BudgetStatus, type Pengeluaran, type PkoStatus,
} from '@/data/koperasi/budget'
import { monthName } from '@/data/koperasi/finance'
import { POS_ANGGARAN, posOf } from '@/data/koperasi/settings'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(12 - i).padStart(2, '0')}`)
const pctText = (n: number) => `${n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const BUD_LABEL: Record<BudgetStatus, string> = { draft: 'Draft', diajukan: 'Diajukan', disahkan: 'Disahkan', ditolak: 'Ditolak' }
const BUD_VARIANT: Record<BudgetStatus, 'neutral' | 'info' | 'success' | 'danger'> = { draft: 'neutral', diajukan: 'info', disahkan: 'success', ditolak: 'danger' }
const PKO_LABEL: Record<PkoStatus, string> = { tercatat: 'Tercatat', 'menunggu-ketua': 'Menunggu Ketua', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan' }
const PKO_VARIANT: Record<PkoStatus, 'success' | 'info' | 'danger' | 'neutral'> = { tercatat: 'success', 'menunggu-ketua': 'info', ditolak: 'danger', dibatalkan: 'neutral' }
const prevMonth = (ym: string) => {
  const t = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 2
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
const bulanOnly = (ym: string) => monthName(ym).split(' ')[0]
const lastDay = (ym: string) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`

function Serapan({ pct }: { pct: number }) {
  // Warning mulai 80%; 100% = Habis (normal, mis. honor pengurus). Danger hanya bila melebihi budget.
  const tone = pct > 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary'
  return (
    <div className="flex min-w-[170px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} data-tone={pct > 100 ? 'danger' : pct >= 80 ? 'warning' : 'default'}>
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={cn('w-14 text-right text-xs tabular-nums', pct > 100 && 'font-medium text-danger')}>{pctText(pct)}</span>
      {pct >= 100 && <StatusBadge variant={pct > 100 ? 'danger' : 'warning'}>{pct > 100 ? 'Lebih' : 'Habis'}</StatusBadge>}
    </div>
  )
}

export default function CoopBudgetPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const isBend = user.role === 'bendahara'
  const isKetua = user.role === 'ketua'
  const [bulan, setBulan] = useState(DEMO_TODAY.slice(0, 7))
  const [tab, setTab] = useState<'budget' | 'pengeluaran'>('budget')
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Master Budget" subtitle="Anggaran bulanan pengurus dan realisasi pengeluaran">
        <Select value={bulan} onValueChange={setBulan}>
          <SelectTrigger aria-label="Bulan" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{monthName(m)}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      {user.role === 'sekretaris' && <Alert variant="info"><AlertDescription>Mode baca. Bendahara menginput; Ketua mengesahkan.</AlertDescription></Alert>}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'budget' | 'pengeluaran')}>
        <TabsList><TabsTrigger value="budget">Budget</TabsTrigger><TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger></TabsList>
      </Tabs>
      {tab === 'budget' ? <BudgetTab bulan={bulan} isBend={isBend} isKetua={isKetua} actor={user.nama} /> : <PengeluaranTab bulan={bulan} isBend={isBend} isKetua={isKetua} actor={user.nama} />}
    </div>
  )
}

const chartConfig = { budget: { label: 'Budget', color: 'var(--chart-2)' }, realisasi: { label: 'Realisasi', color: 'var(--chart-1)' } } satisfies ChartConfig

function BudgetTab({ bulan, isBend, isKetua, actor }: { bulan: string; isBend: boolean; isKetua: boolean; actor: string }) {
  const b = budgetOf(bulan)
  const [confirm, setConfirm] = useState(false)
  const [tinjau, setTinjau] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  if (!b) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-base font-semibold">Budget {monthName(bulan)} belum disusun</h2>
          <p className="text-sm text-muted-foreground">Salin dari bulan sebelumnya atau susun manual per pos anggaran.</p>
          {isBend && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => { const e = copyBudget(bulan, actor); if (e) toast.error(e); else toast.success(`Budget ${monthName(bulan)} disalin sebagai Draft`) }}>Salin Budget Bulan Sebelumnya</Button>
              <Button variant="outline" onClick={() => createManual(bulan)}>Susun Manual</Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  const poses = POS_ANGGARAN.filter((p) => p.aktif || b.items[p.kode] !== undefined)
  const total = budgetTotal(b)
  const real = poses.reduce((a, p) => a + realisasi(bulan, p.kode), 0)
  const wait = poses.reduce((a, p) => a + menunggu(bulan, p.kode), 0)
  const data = poses.map((p) => ({ pos: p.kode, budget: b.items[p.kode] ?? 0, realisasi: realisasi(bulan, p.kode) }))
  const canEdit = isBend && editable(b)
  const errOf = (kode: string) => {
    const v = drafts[kode]
    if (v === undefined || v === '') return ''
    return Number(v) % budgetStep !== 0 ? `Kelipatan ${rp(budgetStep)}` : ''
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={BUD_VARIANT[b.status]}>{BUD_LABEL[b.status]}{b.status === 'disahkan' && b.sah ? ` oleh ${b.sah.oleh} · ${formatDate(b.sah.tanggal)}` : ''}</StatusBadge>
        {b.status === 'ditolak' && b.tolak && <span className="text-sm text-danger">Ditolak {b.tolak.oleh}: {b.tolak.alasan}. Perbaiki lalu ajukan lagi.</span>}
        <div className="ml-auto flex gap-2">
          {canEdit && <Button disabled={Object.keys(drafts).some((k) => errOf(k)) || total === 0} onClick={() => setConfirm(true)}>Ajukan ke Ketua</Button>}
          {isKetua && b.status === 'diajukan' && <Button onClick={() => setTinjau(true)}>Tinjau</Button>}
        </div>
      </div>
      <div className={KPI_GRID}>
        <StatCard label="Total budget" value={rp(total)} icon={Wallet} hint={monthName(bulan)} />
        <StatCard label="Realisasi" value={rp(real)} icon={Banknote} hint="Pengeluaran Tercatat" />
        <StatCard label="Sisa" value={rp(total - real - wait)} icon={PiggyBank} hint="Budget − realisasi − menunggu" />
        <StatCard label="Serapan" value={pctText(total ? (real / total) * 100 : 0)} icon={TrendingUp} hint="Realisasi ÷ budget" />
      </div>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Kode</TableHead><TableHead className={head}>Pos</TableHead><TableHead className={head}>Kategori</TableHead>
                  <TableHead className={`text-right ${head}`}>Budget</TableHead><TableHead className={`text-right ${head}`}>Realisasi</TableHead><TableHead className={`text-right ${head}`}>Menunggu</TableHead><TableHead className={`text-right ${head}`}>Sisa</TableHead><TableHead className={head}>Serapan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poses.map((p) => (
                  <TableRow key={p.kode} className="h-12 hover:bg-muted/50">
                    <TableCell className="font-medium tabular-nums">{p.kode}</TableCell><TableCell>{p.nama}</TableCell><TableCell>{p.kategori}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {canEdit ? (
                        <div className="ml-auto w-36">
                          <Input
                            aria-label={`Budget ${p.kode}`}
                            inputMode="numeric"
                            className="text-right tabular-nums"
                            aria-invalid={!!errOf(p.kode) || undefined}
                            value={rp(Number(drafts[p.kode] ?? b.items[p.kode] ?? 0))}
                            onChange={(e) => {
                              const d = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
                              setDrafts((s) => ({ ...s, [p.kode]: d }))
                              if (d !== '' && Number(d) % budgetStep === 0) setItem(bulan, p.kode, Number(d))
                            }}
                          />
                          {errOf(p.kode) && <p className="mt-1 text-xs text-danger">{errOf(p.kode)}</p>}
                        </div>
                      ) : rp(b.items[p.kode] ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{rp(realisasi(bulan, p.kode))}</TableCell>
                    <TableCell className="text-right tabular-nums">{rp(menunggu(bulan, p.kode))}</TableCell>
                    <TableCell className="text-right tabular-nums">{rp(sisa(bulan, p.kode))}</TableCell>
                    <TableCell><Serapan pct={serapan(bulan, p.kode)} /></TableCell>
                  </TableRow>
                ))}
                <TableRow className="h-12 hover:bg-transparent">
                  <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{rp(total)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{rp(real)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{rp(wait)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{rp(total - real - wait)}</TableCell><TableCell><Serapan pct={total ? (real / total) * 100 : 0} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ChartCard title="Budget dan realisasi per pos" description={monthName(bulan)}>
        <BarChartGrouped data={data} keys={['budget', 'realisasi']} categoryKey="pos" config={chartConfig} layout="horizontal" valueFormatter={rp} height={Math.max(260, data.length * 72 + 56)} />
      </ChartCard>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Ajukan budget {monthName(bulan)} ke Ketua?</AlertDialogTitle><AlertDialogDescription>Total budget {rp(total)}. Setelah diajukan, nominal tidak bisa diubah sampai Ketua memutuskan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { submitBudget(bulan, actor); setDrafts({}); toast.success('Budget diajukan ke Ketua') }}>Ajukan</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {tinjau && (
        <ReviewSheet
          open
          onOpenChange={(o) => !o && setTinjau(false)}
          title={`Tinjau Budget ${monthName(bulan)}`}
          description="Bandingkan dengan bulan lalu sebelum mengesahkan."
          diajukan={b.diajukan?.tanggal ?? DEMO_TODAY}
          oleh={b.diajukan?.oleh ?? 'Bendahara'}
          note={null}
          rejectTitle={`Tolak budget ${monthName(bulan)}?`}
          approveLabel="Sahkan"
          onApprove={() => { decideBudget(bulan, true, '', actor); toast.success(`Budget ${monthName(bulan)} disahkan`); setTinjau(false) }}
          onReject={(a) => { decideBudget(bulan, false, a, actor); toast.success('Budget ditolak, kembali ke Bendahara'); setTinjau(false) }}
        >
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Pos</TableHead><TableHead className={`text-right ${head}`}>Bulan lalu</TableHead><TableHead className={`text-right ${head}`}>Usulan</TableHead><TableHead className={`text-right ${head}`}>Selisih</TableHead></TableRow></TableHeader>
            <TableBody>
              {poses.map((p) => {
                const lama = BUDGETS[prevMonth(bulan)]?.items[p.kode] ?? 0
                const baru = b.items[p.kode] ?? 0
                const d = baru - lama
                return (
                  <TableRow key={p.kode}>
                    <TableCell>{p.kode} {p.nama}</TableCell><TableCell className="text-right tabular-nums">{rp(lama)}</TableCell><TableCell className="text-right font-medium tabular-nums">{rp(baru)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', d > 0 && 'text-success', d < 0 && 'text-danger')}>{d === 0 ? '—' : <>{d > 0 ? <TrendingUp className="mr-1 inline size-3" aria-hidden /> : <TrendingDown className="mr-1 inline size-3" aria-hidden />}{rp(Math.abs(d))}</>}</TableCell>
                  </TableRow>
                )
              })}
              <TableRow><TableCell className="font-semibold">Total</TableCell><TableCell className="text-right tabular-nums">{rp(BUDGETS[prevMonth(bulan)] ? budgetTotal(BUDGETS[prevMonth(bulan)]) : 0)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{rp(total)}</TableCell><TableCell /></TableRow>
            </TableBody>
          </Table>
        </ReviewSheet>
      )}
    </>
  )
}

function PengeluaranTab({ bulan, isBend, isKetua, actor }: { bulan: string; isBend: boolean; isKetua: boolean; actor: string }) {
  const [catat, setCatat] = useState(false)
  const [review, setReview] = useState<Pengeluaran | null>(null)
  const [batal, setBatal] = useState<Pengeluaran | null>(null)
  const [alasan, setAlasan] = useState('')
  const [batalErr, setBatalErr] = useState('')
  const list = PENGELUARAN.filter((p) => p.tanggal.startsWith(bulan))
  const b = budgetOf(bulan)
  const blocked = b?.status !== 'disahkan'
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {blocked && <Alert variant="warning" className="flex-1"><AlertDescription>Budget {monthName(bulan)} belum disahkan Ketua.</AlertDescription></Alert>}
        {isBend && <Button className="ml-auto" onClick={() => setCatat(true)}><Plus /> Catat Pengeluaran</Button>}
      </div>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>No.</TableHead><TableHead className={head}>Tanggal</TableHead><TableHead className={head}>Pos</TableHead><TableHead className={head}>Keterangan</TableHead><TableHead className={head}>Penerima</TableHead><TableHead className={head}>Metode</TableHead>
                  <TableHead className={`text-right ${head}`}>Nominal</TableHead><TableHead className={head}>Bukti</TableHead><TableHead className={head}>Dicatat oleh</TableHead><TableHead className={head}>Status</TableHead><TableHead className={`text-right ${head}`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">{bulan < '2026-10' ? 'Bulan ini berisi ringkasan data migrasi per pos (lihat tab Budget).' : 'Belum ada pengeluaran pada bulan ini.'}</TableCell></TableRow>}
                {list.map((p) => (
                  <TableRow key={p.id} className="h-12 hover:bg-muted/50">
                    <TableCell className="font-medium tabular-nums">{p.id}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{formatDate(p.tanggal)}</TableCell>
                    <TableCell>{p.pos}</TableCell><TableCell className="max-w-[240px] whitespace-normal">{p.keterangan}</TableCell><TableCell>{p.penerima}</TableCell><TableCell>{p.metode}</TableCell>
                    <TableCell className="text-right tabular-nums">{rp(p.nominal)}</TableCell>
                    <TableCell><Button variant="link" size="sm" className="h-auto p-0" onClick={() => toast.info(`Pratinjau ${p.bukti} (simulasi)`)}><Paperclip aria-hidden />Nota</Button></TableCell>
                    <TableCell>{p.oleh}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge variant={PKO_VARIANT[p.status]}>{PKO_LABEL[p.status]}</StatusBadge>
                        {p.disetujui && <span className="text-xs text-muted-foreground">Disetujui {p.disetujui.oleh} {formatDate(p.disetujui.tanggal)}</span>}
                        {p.tolak && <span className="max-w-[200px] truncate text-xs text-muted-foreground" title={p.tolak.alasan}>{p.tolak.alasan}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isKetua && p.status === 'menunggu-ketua' && <Button variant="outline" size="sm" onClick={() => setReview(p)}>Tinjau</Button>}
                      {isBend && p.status === 'menunggu-ketua' && <Button variant="ghost" size="sm" onClick={() => { setAlasan(''); setBatalErr(''); setBatal(p) }}>Batalkan</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {catat && <CatatSheet bulan={bulan} actor={actor} onClose={() => setCatat(false)} />}
      {review && (
        <ReviewSheet
          open
          onOpenChange={(o) => !o && setReview(null)}
          title={`Tinjau Pengeluaran · ${review.id}`}
          description={`${review.pos} ${posOf(review.pos)?.nama ?? ''}`}
          diajukan={review.tanggal}
          oleh={review.oleh}
          note={null}
          rejectTitle={`Tolak ${review.id}?`}
          onApprove={() => { decidePengeluaran(review.id, true, '', actor); toast.success(`${review.id} Tercatat`); setReview(null) }}
          onReject={(a) => { decidePengeluaran(review.id, false, a, actor); toast.success(`${review.id} ditolak, anggaran dilepas`); setReview(null) }}
        >
          <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Nominal</dt><dd className="font-medium tabular-nums">{rp(review.nominal)}</dd>
            <dt className="text-muted-foreground">Keterangan</dt><dd>{review.keterangan}</dd>
            <dt className="text-muted-foreground">Penerima</dt><dd>{review.penerima} · {review.metode}</dd>
            <dt className="text-muted-foreground">Bukti</dt><dd>{review.bukti}</dd>
            <dt className="text-muted-foreground">Sisa {review.pos}</dt><dd className="tabular-nums">{rp(sisa(review.tanggal.slice(0, 7), review.pos) + review.nominal)} sebelum pengeluaran ini</dd>
          </dl>
        </ReviewSheet>
      )}
      <AlertDialog open={!!batal} onOpenChange={(o) => !o && setBatal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Batalkan {batal?.id}?</AlertDialogTitle><AlertDialogDescription>Anggaran yang dipesan langsung dilepas.</AlertDialogDescription></AlertDialogHeader>
          <AlasanField id="pko-batal" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setBatalErr('') }} error={batalErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => { if (!alasanOk(alasan)) { e.preventDefault(); setBatalErr(ALASAN_ERROR); return } cancelPengeluaran(batal!.id, alasan.trim(), actor); toast.success(`${batal!.id} dibatalkan`) }}>Batalkan Pengeluaran</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CatatSheet({ bulan, actor, onClose }: { bulan: string; actor: string; onClose: () => void }) {
  const max = DEMO_TODAY < lastDay(bulan) ? DEMO_TODAY : lastDay(bulan)
  const [tanggal, setTanggal] = useState(max >= `${bulan}-01` ? max : '')
  const [pos, setPos] = useState('')
  const [nominal, setNominal] = useState('')
  const [ket, setKet] = useState('')
  const [penerima, setPenerima] = useState('')
  const [metode, setMetode] = useState<'Tunai' | 'Transfer'>('Tunai')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  const b = budgetOf(bulan)
  const blocked = b?.status !== 'disahkan'
  const n = Number(nominal || 0)
  const overErr = !blocked && pos && n ? pkoError({ tanggal: tanggal || `${bulan}-01`, pos, nominal: n }) : ''
  const e = {
    tanggal: !tanggal ? 'Tanggal wajib diisi' : !tanggal.startsWith(bulan) || tanggal > DEMO_TODAY ? 'Tanggal harus dalam bulan terpilih dan tidak setelah hari ini' : '',
    pos: !pos ? 'Pilih pos anggaran' : '', nominal: !nominal ? 'Nominal wajib diisi' : overErr,
    ket: ket.trim().length < 10 ? 'Keterangan minimal 10 karakter' : '', penerima: penerima.trim() ? '' : 'Penerima wajib diisi', file: file ? '' : 'Bukti nota wajib diunggah',
  }
  const hasErr = Object.values(e).some(Boolean)
  const batas = batasPengeluaran()
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader><SheetTitle>Catat Pengeluaran</SheetTitle><SheetDescription>Pengeluaran Koperasi per pos anggaran, {monthName(bulan)}.</SheetDescription></SheetHeader>
        <div className="space-y-4 px-4">
          {blocked && <Alert variant="warning"><AlertDescription>Budget {monthName(bulan)} belum disahkan Ketua.</AlertDescription></Alert>}
          <Field id="pk-tanggal" label="Tanggal" required error={touched ? e.tanggal : ''}>
            <DatePicker id="pk-tanggal" value={tanggal} onChange={setTanggal} min={`${bulan}-01`} max={max >= `${bulan}-01` ? max : `${bulan}-01`} invalid={touched && !!e.tanggal} />
          </Field>
          <Field id="pk-pos" label="Pos anggaran" required error={touched ? e.pos : ''}>
            <Select value={pos} onValueChange={setPos} disabled={blocked}>
              <SelectTrigger id="pk-pos" className="w-full"><SelectValue placeholder="Pilih pos" /></SelectTrigger>
              <SelectContent>{POS_ANGGARAN.filter((p) => p.aktif).map((p) => <SelectItem key={p.kode} value={p.kode}>{p.kode} {p.nama} · sisa {rp(Math.max(0, sisa(bulan, p.kode)))}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {pos && !blocked && <p className="text-sm tabular-nums" data-testid="sisa-line">Sisa anggaran {pos} {bulanOnly(bulan)}: <span className="font-medium">{rp(Math.max(0, sisa(bulan, pos)))}</span></p>}
          <MoneyField id="pk-nominal" label="Nominal" value={nominal} onChange={setNominal} error={touched || overErr ? e.nominal : ''} />
          {n > 0 && <p className="text-xs text-muted-foreground">{n <= batas ? 'Langsung Tercatat.' : 'Perlu persetujuan Ketua (Menunggu Ketua).'}</p>}
          <Field id="pk-ket" label="Keterangan" required error={touched ? e.ket : ''} helper={`Minimal 10 karakter · ${ket.trim().length}/10`}><Textarea id="pk-ket" value={ket} onChange={(x) => setKet(x.target.value)} /></Field>
          <Field id="pk-penerima" label="Penerima / toko" required error={touched ? e.penerima : ''}><Input id="pk-penerima" value={penerima} onChange={(x) => setPenerima(x.target.value)} /></Field>
          <Field id="pk-metode" label="Metode" required>
            <RadioGroup value={metode} onValueChange={(v) => setMetode(v as 'Tunai' | 'Transfer')} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Tunai" /> Tunai</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Transfer" /> Transfer</label>
            </RadioGroup>
          </Field>
          <Field id="pk-bukti" label="Bukti nota" required error={touched ? e.file : ''} helper="Foto atau PDF, maks. 5 MB">
            <FilePicker id="pk-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('pk-bukti', true, false)} />
          </Field>
          <p className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">≤ {rp(batas)} langsung tercatat · di atas itu perlu persetujuan Ketua.</p>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            disabled={blocked || !!overErr}
            onClick={() => {
              setTouched(true)
              if (hasErr) return
              const res = createPengeluaran({ tanggal, pos, nominal: n, keterangan: ket, penerima, metode, bukti: file!.name }, actor)
              if (res.error) return toast.error(res.error)
              toast.success(res.status === 'tercatat' ? `${res.id} Tercatat` : `${res.id} menunggu persetujuan Ketua`)
              onClose()
            }}
          >
            Simpan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

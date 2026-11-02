import { ArrowDownLeft, ArrowUpRight, Paperclip, Plus, Scale, TrendingUp } from 'lucide-react'
import { ALASAN_ERROR } from '@/lib/validators'
import { useState } from 'react'
import { toast } from 'sonner'
import { BarChartSimple, ChartCard } from '@/components/charts'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { AlasanField, alasanOk, MoneyField, rp, SHEET_W } from '@/components/koperasi/shared'
import { KPI_GRID, PageHeader, StatCard } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { monthName } from '@/data/koperasi/finance'
import { useKoperasi } from '@/data/koperasi/store'
import { createUd, kategoriOptions, keluar, masuk, selisih, selisihTahun, udMonth, type UdJenis, type UdTx } from '@/data/koperasi/trading'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(12 - i).padStart(2, '0')}`)
const signed = (n: number) => (n < 0 ? `−${rp(Math.abs(n))}` : rp(n))
const config = { selisih: { label: 'Selisih', color: 'var(--chart-1)' } } satisfies ChartConfig
const lastDay = (ym: string) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`

export default function CoopTradingPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const isBend = user.role === 'bendahara'
  const [bulan, setBulan] = useState(DEMO_TODAY.slice(0, 7))
  const [sheet, setSheet] = useState<{ koreksi?: UdTx } | null>(null)
  const sel = selisih(bulan)
  const year = bulan.slice(0, 4)
  const tahun = selisihTahun(year)
  const chart = Array.from({ length: 10 }, (_, i) => {
    const m = `2026-${String(i + 1).padStart(2, '0')}`
    return { bulan: monthName(m).slice(0, 3), selisih: selisih(m) }
  })
  const rows = udMonth(bulan)
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Unit Dagang" subtitle="Uang masuk dan keluar unit dagang; selisihnya menjadi pendapatan koperasi untuk SHU">
        <Select value={bulan} onValueChange={setBulan}>
          <SelectTrigger aria-label="Bulan" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{monthName(m)}</SelectItem>)}</SelectContent>
        </Select>
        {isBend && <Button onClick={() => setSheet({})}><Plus /> Catat Transaksi</Button>}
      </PageHeader>
      {!isBend && <Alert variant="info"><AlertDescription>Mode baca. Transaksi dicatat Bendahara.</AlertDescription></Alert>}

      <div className={KPI_GRID}>
        <StatCard label="Uang masuk" value={rp(masuk(bulan))} icon={ArrowDownLeft} hint={monthName(bulan)} />
        <StatCard label="Uang keluar" value={rp(keluar(bulan))} icon={ArrowUpRight} hint={monthName(bulan)} />
        <StatCard label="Selisih bulan ini" value={signed(sel)} icon={Scale} hint="Masuk − keluar" />
        <StatCard label={`Selisih tahun berjalan (${year})`} value={signed(tahun)} icon={TrendingUp} hint="Pendapatan unit dagang untuk SHU" />
      </div>

      <ChartCard title="Selisih per bulan 2026" description="Januari – Oktober">
        <BarChartSimple data={chart} dataKey="selisih" categoryKey="bulan" config={config} height={260} valueFormatter={rp} />
      </ChartCard>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>No. / Tanggal</TableHead><TableHead className={head}>Jenis</TableHead><TableHead className={head}>Kategori</TableHead><TableHead className={head}>Keterangan</TableHead>
                  <TableHead className={`text-right ${head}`}>Nominal</TableHead><TableHead className={head}>Bukti</TableHead><TableHead className={head}>Dicatat oleh</TableHead><TableHead className={`text-right ${head}`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">Belum ada transaksi pada bulan ini.</TableCell></TableRow>}
                {rows.map((t) => (
                  <TableRow key={t.id} className="h-12 hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap tabular-nums"><div className="font-medium">{t.migrasi ? '—' : t.id}</div><div className="text-xs text-muted-foreground">{formatDate(t.tanggal)}</div></TableCell>
                    <TableCell><StatusBadge variant={t.jenis === 'Masuk' ? 'success' : 'neutral'}>{t.jenis}</StatusBadge></TableCell>
                    <TableCell className="whitespace-nowrap">{t.kategori}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <Tooltip>
                        <TooltipTrigger asChild><span tabIndex={0} className="block truncate">{t.keterangan}</span></TooltipTrigger>
                        <TooltipContent className="max-w-xs">{t.keterangan}</TooltipContent>
                      </Tooltip>
                      {t.dikoreksiOleh && <span className="block text-xs text-muted-foreground">Dikoreksi oleh {t.dikoreksiOleh}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{rp(t.nominal)}</TableCell>
                    <TableCell>{t.migrasi ? <span className="text-muted-foreground">—</span> : <Button variant="link" size="sm" className="h-auto p-0" onClick={() => toast.info(`Pratinjau ${t.bukti} (simulasi)`)}><Paperclip aria-hidden />Bukti</Button>}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.oleh}</TableCell>
                    <TableCell className="text-right">{isBend && !t.migrasi && !t.dikoreksiOleh && !t.koreksiDari && <Button variant="ghost" size="sm" onClick={() => setSheet({ koreksi: t })}>Koreksi</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {sheet && <TxSheet koreksi={sheet.koreksi} bulan={bulan} actor={user.nama} onClose={() => setSheet(null)} />}
    </div>
  )
}

function TxSheet({ koreksi, bulan, actor, onClose }: { koreksi?: UdTx; bulan: string; actor: string; onClose: () => void }) {
  const [jenis, setJenis] = useState<UdJenis>(koreksi ? (koreksi.jenis === 'Masuk' ? 'Keluar' : 'Masuk') : 'Masuk')
  const defTanggal = koreksi ? DEMO_TODAY : bulan === DEMO_TODAY.slice(0, 7) ? DEMO_TODAY : lastDay(bulan) <= DEMO_TODAY ? lastDay(bulan) : DEMO_TODAY
  const [tanggal, setTanggal] = useState(defTanggal)
  const [kategori, setKategori] = useState(koreksi?.kategori ?? '')
  const [nominal, setNominal] = useState(koreksi ? String(koreksi.nominal) : '')
  const [ket, setKet] = useState('')
  const [alasan, setAlasan] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  const kategoris = kategoriOptions(jenis)
  const keterangan = koreksi ? `Koreksi ${koreksi.id}: ${alasan.trim()}` : ket
  const e = {
    tanggal: !tanggal ? 'Tanggal wajib diisi' : tanggal > DEMO_TODAY ? 'Tanggal tidak boleh setelah hari ini' : '',
    kategori: kategori ? '' : 'Pilih kategori', nominal: nominal ? '' : 'Nominal wajib diisi',
    ket: koreksi ? (alasanOk(alasan) ? '' : ALASAN_ERROR) : ket.trim().length < 10 ? 'Keterangan minimal 10 karakter' : '',
    file: file ? '' : 'Bukti wajib diunggah',
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>{koreksi ? `Koreksi ${koreksi.id}` : 'Catat Transaksi'}</SheetTitle>
          <SheetDescription>{koreksi ? 'Transaksi baru berlawanan jenis; transaksi asal tidak diubah atau dihapus.' : 'Uang masuk dan keluar Unit Dagang.'}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="ud-jenis" label="Jenis" required>
            <RadioGroup value={jenis} onValueChange={(v) => { setJenis(v as UdJenis); setKategori('') }} className="grid grid-cols-2 gap-3" disabled={!!koreksi}>
              {(['Masuk', 'Keluar'] as const).map((j) => (
                <label key={j} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm', jenis === j && 'ring-2 ring-ring')}>
                  <RadioGroupItem value={j} /> {j === 'Masuk' ? 'Uang masuk' : 'Uang keluar'}
                </label>
              ))}
            </RadioGroup>
          </Field>
          <Field id="ud-tanggal" label="Tanggal" required error={touched ? e.tanggal : ''}><DatePicker id="ud-tanggal" value={tanggal} onChange={setTanggal} max={DEMO_TODAY} invalid={touched && !!e.tanggal} /></Field>
          <Field id="ud-kategori" label="Kategori" required error={touched ? e.kategori : ''}>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger id="ud-kategori" className="w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>{kategoris.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <MoneyField id="ud-nominal" label="Nominal" value={nominal} onChange={setNominal} error={touched ? e.nominal : ''} disabled={!!koreksi} />
          {koreksi ? (
            <>
              <AlasanField id="ud-alasan" label="Alasan koreksi" value={alasan} onChange={setAlasan} error={touched ? e.ket : ''} />
              <Field id="ud-ket" label="Keterangan"><Textarea id="ud-ket" readOnly value={keterangan} className="bg-muted/50" /></Field>
            </>
          ) : (
            <Field id="ud-ket" label="Keterangan" required error={touched ? e.ket : ''} helper={`Minimal 10 karakter · ${ket.trim().length}/10`}><Textarea id="ud-ket" value={ket} onChange={(x) => setKet(x.target.value)} /></Field>
          )}
          <Field id="ud-bukti" label="Bukti" required error={touched ? e.file : ''} helper={jenis === 'Masuk' ? 'Rekap penjualan (foto atau PDF, maks. 5 MB)' : 'Nota pembelian (foto atau PDF, maks. 5 MB)'}>
            <FilePicker id="ud-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('ud-bukti', true, false)} />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (Object.values(e).some(Boolean)) return
              const res = createUd({ jenis, tanggal, kategori, nominal: Number(nominal), keterangan, bukti: file!.name, koreksiDari: koreksi?.id }, actor)
              if (res.error) return toast.error(res.error)
              toast.success(koreksi ? `${res.id} mengoreksi ${koreksi.id}` : `${res.id} dicatat`)
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

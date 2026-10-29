import { CircleCheck, Clock, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { rp } from '@/components/koperasi/shared'
import { PageHeader, PersonCell } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { billsFor, billTotal, KOPERASI_LABEL, type KoperasiKind } from '@/data/koperasi-deductions'
import { billStateOf, markBillsSent, periodLabel } from '@/data/koperasi/loans'
import { isConfirmed, konfirmasi, realisasiOf, summarize } from '@/data/koperasi/realisasi'
import { empOf } from '@/data/koperasi/requests'
import { stageActor } from '@/data/koperasi/ksb'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const PERIODS = ['2026-10', '2026-11', '2026-12']
const KINDS: KoperasiKind[] = ['kasbon', 'angsuran', 'pinjamanNon', 'simpananWajib', 'simpananSukarela']
const BATCH_LABEL = { draft: 'Draft', terkirim: 'Terkirim ke Payroll', ditarik: 'Ditarik Payroll' } as const
const BATCH_VARIANT = { draft: 'neutral', terkirim: 'info', ditarik: 'success' } as const

export default function CoopPayrollDeductionsPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const [tab, setTab] = useState<'tagihan' | 'realisasi'>('tagihan')
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Potongan Payroll" subtitle="Tagihan potongan ke Payroll dan realisasi potongan dari Payroll" />
      {user.role === 'ketua' && <Alert variant="info"><AlertDescription>Mode baca. Tagihan dikirim Sekretaris; realisasi dikonfirmasi Bendahara.</AlertDescription></Alert>}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'tagihan' | 'realisasi')}>
        <TabsList>
          <TabsTrigger value="tagihan">Tagihan ke Payroll</TabsTrigger>
          <TabsTrigger value="realisasi">Realisasi dari Payroll</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'tagihan' ? <Tagihan user={user} /> : <RealisasiTab user={user} />}
    </div>
  )
}

function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Periode payroll" className="min-w-60"><SelectValue /></SelectTrigger>
      <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>Payroll {periodLabel(p)}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function Tagihan({ user }: { user: CurrentUser }) {
  const [period, setPeriod] = useState('2026-10')
  const [confirm, setConfirm] = useState(false)
  const st = billStateOf(period)
  const bills = billsFor(period)
  const sums = KINDS.map((kind) => {
    const ls = bills.filter((b) => b.kind === kind)
    return { kind, n: new Set(ls.map((b) => b.nik)).size, total: ls.reduce((a, b) => a + billTotal(b), 0) }
  }).filter((x) => x.n > 0)
  const total = sums.reduce((a, x) => a + x.total, 0)
  const detail = bills.filter((b) => b.kind !== 'simpananWajib')
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelect value={period} onChange={setPeriod} />
        <StatusBadge variant={BATCH_VARIANT[st.status]}>{BATCH_LABEL[st.status]}{st.at ? ` · ${st.at}` : ''}</StatusBadge>
        {user.role === 'sekretaris' && st.status === 'draft' && <Button className="ml-auto" onClick={() => setConfirm(true)}><Send /> Kirim Tagihan</Button>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tagihan Payroll {periodLabel(period)}</CardTitle>
          <CardDescription>{st.status === 'draft' ? 'Draft. Tagihan baru yang disetujui sebelum dikirim ikut periode ini.' : `Terkirim ${st.at} oleh ${st.by}. Daftar dibekukan; pengajuan baru masuk periode berikutnya.`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Jenis</TableHead><TableHead className={`text-right ${head}`}>Anggota</TableHead><TableHead className={`text-right ${head}`}>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {sums.map((x) => <TableRow key={x.kind} className="h-12"><TableCell className="font-medium">{KOPERASI_LABEL[x.kind]}</TableCell><TableCell className="text-right tabular-nums">{x.n.toLocaleString('id-ID')}</TableCell><TableCell className="text-right tabular-nums">{rp(x.total)}</TableCell></TableRow>)}
              <TableRow className="h-12 hover:bg-transparent"><TableCell className="font-semibold">Total</TableCell><TableCell /><TableCell className="text-right font-semibold tabular-nums">{rp(total)}</TableCell></TableRow>
            </TableBody>
          </Table>
          {detail.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Rincian kasbon dan angsuran</h3>
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Anggota</TableHead><TableHead className={head}>Jenis</TableHead><TableHead className={`text-right ${head}`}>Nominal</TableHead></TableRow></TableHeader>
                <TableBody>{detail.map((b, i) => <TableRow key={i} className="h-12"><TableCell><PersonCell nama={empOf(b.nik)?.nama ?? b.nik} nik={b.nik} /></TableCell><TableCell>{KOPERASI_LABEL[b.kind]}{b.admin ? ` (+ admin ${rp(b.admin)})` : ''}</TableCell><TableCell className="text-right tabular-nums">{rp(billTotal(b))}</TableCell></TableRow>)}</TableBody>
              </Table>
            </section>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim tagihan Payroll {periodLabel(period)}?</AlertDialogTitle>
            <AlertDialogDescription>Total {rp(total)}. Setelah dikirim daftar dibekukan.</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1 text-sm">{sums.map((x) => <li key={x.kind} className="flex justify-between tabular-nums"><span>{KOPERASI_LABEL[x.kind]} ({x.n})</span><span>{rp(x.total)}</span></li>)}</ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { markBillsSent(period, user.nama); toast.success(`Tagihan ${periodLabel(period)} terkirim ke Payroll`) }}>Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RealisasiTab({ user }: { user: CurrentUser }) {
  const [period, setPeriod] = useState('2026-10')
  const [open, setOpen] = useState(false)
  const r = realisasiOf(period)
  const done = isConfirmed(period)
  const actor = stageActor('bendahara', '')
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelect value={period} onChange={setPeriod} />
        {r && <StatusBadge variant={done ? 'success' : 'info'}>{done ? <><CircleCheck aria-hidden />Dikonfirmasi {formatDate(r.konfirmasi!.tanggal)}</> : <><Clock aria-hidden />Menunggu konfirmasi Bendahara</>}</StatusBadge>}
        {r && !done && user.role === 'bendahara' && <Button className="ml-auto" onClick={() => setOpen(true)}>Tinjau &amp; Konfirmasi</Button>}
      </div>
      {!r ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Belum ada realisasi dari Payroll untuk {periodLabel(period)}. Payroll mengirimnya lewat Rekonsiliasi › Kirim ke Koperasi.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Realisasi Payroll {periodLabel(period)}</CardTitle>
            <CardDescription>Dikirim {r.sent.by} · {r.sent.at}</CardDescription>
          </CardHeader>
          <CardContent><RealTable period={period} /></CardContent>
        </Card>
      )}
      {open && r && (
        <Sheet open onOpenChange={setOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Tinjau &amp; Konfirmasi · {periodLabel(period)}</SheetTitle>
              <SheetDescription>Saldo berubah setelah Anda mengonfirmasi. Baris Tertahan tetap terbuka dan ditagih lagi di periode berikutnya.</SheetDescription>
            </SheetHeader>
            <div className="px-4"><RealTable period={period} /></div>
            <SheetFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
              <Button onClick={() => { konfirmasi(period, actor.nama); toast.success(`Realisasi ${periodLabel(period)} dikonfirmasi`); setOpen(false) }}>Konfirmasi</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

function RealTable({ period }: { period: string }) {
  const r = realisasiOf(period)!
  const sums = summarize(r)
  const held = r.lines.filter((l) => l.hold)
  return (
    <div className="space-y-5">
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Jenis</TableHead><TableHead className={`text-right ${head}`}>Ditagihkan</TableHead><TableHead className={`text-right ${head}`}>Dipotong</TableHead><TableHead className={`text-right ${head}`}>Selisih</TableHead><TableHead className={`text-right ${head}`}>Tertahan</TableHead></TableRow></TableHeader>
        <TableBody>{sums.map((s) => <TableRow key={s.kind} className="h-12"><TableCell className="font-medium">{KOPERASI_LABEL[s.kind]}</TableCell><TableCell className="text-right tabular-nums">{rp(s.ditagih)}</TableCell><TableCell className="text-right tabular-nums">{rp(s.dipotong)}</TableCell><TableCell className="text-right tabular-nums">{rp(s.selisih)}</TableCell><TableCell className="text-right tabular-nums">{s.tertahan.length}</TableCell></TableRow>)}</TableBody>
      </Table>
      {held.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Tertahan</h3>
          <ul className="divide-y rounded-md border text-sm">
            {held.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span><span className="font-medium">{empOf(l.nik)?.nama}</span> · {KOPERASI_LABEL[l.kind]} · <span className="tabular-nums">{rp(l.ditagih)}</span></span>
                <StatusBadge variant="warning">Tertahan: gaji {l.hold === 'gagal' ? 'gagal ditransfer' : 'ditunda'}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

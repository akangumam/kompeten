import { Clock, Landmark, ListChecks, Search, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { descId, Field } from '@/components/employee/field'
import { CoopCombobox, Meta, MoneyField, ReviewSheet, rp, SHEET_W } from '@/components/koperasi/shared'
import { TransferDialog } from '@/components/koperasi/transfer-dialog'
import { KPI_GRID, PageHeader, PersonCell, StatCard } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SourceBadge } from '@/components/mobile/source-badge'
import { VerifySheet } from '@/components/koperasi/verify-sheet'
import { appCount, loanChecks } from '@/data/koperasi/mobile'
import {
  BILL_PERIOD_IDS, billStateOf, cairkanLoan, cancelLoan, catatPelunasan, createLoan, createNonKop, decideLoan, eligibility, konfirmasiPelunasan, koperasiLoans, loanBlock, loanDisburser,
  loanError, loanMutasi, loanReviewer, lunasCount, nonLoans, paidSum, periodLabel, plafon, scheduleOf, setorNonKop, sisaOf, TUJUAN, type InstStatus, type Loan, type LoanStatus,
} from '@/data/koperasi/loans'
import { activeMembers } from '@/data/koperasi/members'
import { empOf, rekeningOf } from '@/data/koperasi/requests'
import { settingAt } from '@/data/koperasi/settings'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const LABEL: Record<LoanStatus, string> = { 'menunggu-sekretaris': 'Menunggu Sekretaris', 'menunggu-ketua': 'Menunggu Ketua', disetujui: 'Disetujui, menunggu pencairan', aktif: 'Aktif', lunas: 'Lunas', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan' }
const VARIANT: Record<LoanStatus, 'info' | 'success' | 'danger' | 'neutral' | 'warning'> = { 'menunggu-sekretaris': 'warning', 'menunggu-ketua': 'info', disetujui: 'info', aktif: 'success', lunas: 'neutral', ditolak: 'danger', dibatalkan: 'neutral' }
const INST_LABEL: Record<InstStatus, string> = { akan: 'Akan datang', ditagihkan: 'Ditagihkan', lunas: 'Lunas', tertahan: 'Tertahan' }
const INST_VARIANT: Record<InstStatus, 'neutral' | 'warning' | 'success'> = { akan: 'neutral', ditagihkan: 'warning', lunas: 'success', tertahan: 'warning' }
const curMonth = DEMO_TODAY.slice(0, 7)

export default function CoopLoansPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const isSek = user.role === 'sekretaris'
  const isKetua = user.role === 'ketua'
  const isBend = user.role === 'bendahara'
  const [tab, setTab] = useState<'koperasi' | 'non'>('koperasi')
  const [q, setQ] = useState('')
  const [ajukan, setAjukan] = useState(false)
  const [nonSheet, setNonSheet] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [review, setReview] = useState<Loan | null>(null)
  const [cair, setCair] = useState<Loan | null>(null)
  const [verif, setVerif] = useState<Loan | null>(null)
  const [view, setView] = useState<'aplikasi' | 'semua'>('aplikasi')

  const all = tab === 'koperasi' ? koperasiLoans() : nonLoans()
  const nApp = appCount.pinjaman()
  const onApp = isSek && tab === 'koperasi' && nApp > 0 && view === 'aplikasi'
  const list = all.filter((l) => (!onApp || l.status === 'menunggu-sekretaris') && (!q || `${empOf(l.nik)?.nama} ${l.id}`.toLowerCase().includes(q.trim().toLowerCase())))
  const aktif = all.filter((l) => l.status === 'aktif')
  const bulanIni = aktif.reduce((a, l) => a + l.inst.filter((i) => i.tagihPeriode === curMonth && i.status !== 'lunas').reduce((x, i) => x + i.nominal, 0), 0)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Pinjaman" subtitle="Pinjaman Koperasi tanpa jasa dan pencatatan pinjaman Non-Koperasi, dilunasi lewat potong gaji">
        {isSek && (tab === 'koperasi' ? <Button onClick={() => setAjukan(true)}>Ajukan Pinjaman</Button> : <Button onClick={() => setNonSheet(true)}>Catat Pinjaman Non-Koperasi</Button>)}
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'koperasi' | 'non')}>
        <TabsList>
          <TabsTrigger value="koperasi">Pinjaman Koperasi</TabsTrigger>
          <TabsTrigger value="non">Pinjaman Non-Koperasi</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'non' && <Alert variant="info"><AlertDescription>Bukan dana koperasi. Koperasi hanya mencatat dan menagihkan angsuran lewat payroll, lalu menyetorkannya ke pemberi pinjaman.</AlertDescription></Alert>}

      <div className={KPI_GRID}>
        <StatCard label="Pinjaman aktif" value={aktif.length.toLocaleString('id-ID')} icon={Landmark} hint={tab === 'koperasi' ? 'Pinjaman Koperasi' : 'Non-Koperasi'} />
        <StatCard label="Sisa pokok" value={rp(aktif.reduce((a, l) => a + sisaOf(l), 0))} icon={Wallet} hint={tab === 'koperasi' ? 'Sebelum realisasi bulan ini' : 'Sisa kewajiban'} />
        <StatCard label="Angsuran bulan ini" value={rp(bulanIni)} icon={ListChecks} hint={`Payroll ${periodLabel(curMonth)}`} />
        <StatCard label="Menunggu persetujuan" value={all.filter((l) => l.status === 'menunggu-ketua').length.toLocaleString('id-ID')} icon={Clock} hint="Menunggu Ketua" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          {isSek && tab === 'koperasi' && nApp > 0 && (
            <Tabs value={view} onValueChange={(v) => setView(v as 'aplikasi' | 'semua')}>
              <TabsList>
                <TabsTrigger value="aplikasi">Dari aplikasi ({nApp})</TabsTrigger>
                <TabsTrigger value="semua">Semua pinjaman</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Cari pinjaman" placeholder="Cari anggota atau nomor…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>No.</TableHead>
                <TableHead className={head}>Anggota</TableHead>
                <TableHead className={`text-right ${head}`}>Pokok</TableHead>
                <TableHead className={head}>Tenor</TableHead>
                <TableHead className={`text-right ${head}`}>Angsuran</TableHead>
                <TableHead className={head}>Terbayar</TableHead>
                <TableHead className={`text-right ${head}`}>Sisa pokok</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">Belum ada pinjaman.</TableCell></TableRow>}
              {list.map((l) => (
                <TableRow key={l.id} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium tabular-nums">{l.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <PersonCell nama={empOf(l.nik)?.nama ?? l.nik} nik={l.nik} />
                      <SourceBadge sumber={l.sumber} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rp(l.pokok)}</TableCell>
                  <TableCell className="tabular-nums">{l.tenor} bulan</TableCell>
                  <TableCell className="text-right tabular-nums">{rp(l.angsuran ?? scheduleOf(l.pokok, l.tenor)[0] ?? 0)}</TableCell>
                  <TableCell className="tabular-nums">{lunasCount(l)}/{l.tenor}</TableCell>
                  <TableCell className="text-right tabular-nums">{rp(sisaOf(l))}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge variant={VARIANT[l.status]}>{LABEL[l.status]}</StatusBadge>
                      {l.inst.some((i) => i.status === 'tertahan') && <StatusBadge variant="warning">Angsuran Tertahan</StatusBadge>}
                      {l.pelunasan?.status === 'menunggu-bendahara' && <StatusBadge variant="info">Pelunasan menunggu konfirmasi</StatusBadge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isSek && l.status === 'menunggu-sekretaris' && <Button variant="outline" size="sm" onClick={() => setVerif(l)}>Verifikasi</Button>}
                      {isKetua && l.status === 'menunggu-ketua' && <Button variant="outline" size="sm" onClick={() => setReview(l)}>Tinjau</Button>}
                      {isBend && l.status === 'disetujui' && <Button variant="outline" size="sm" onClick={() => setCair(l)}>Cairkan</Button>}
                      <Button variant="ghost" size="sm" onClick={() => setDetail(l.id)}>Detail</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {ajukan && <AjukanSheet actor={user.nama} onClose={() => setAjukan(false)} />}
      {nonSheet && <NonKopSheet actor={user.nama} onClose={() => setNonSheet(false)} />}
      {verif && (
        <VerifySheet
          kind="pinjaman" id={verif.id} who={empOf(verif.nik)?.nama ?? verif.nik} diajukan={verif.diajukan} oleh={verif.diinputOleh} actor={user.nama}
          checks={loanChecks(verif)} onClose={() => setVerif(null)}
          rows={[
            ['Anggota', `${empOf(verif.nik)?.nama} · ${verif.nik}`],
            ['Pokok', rp(verif.pokok)],
            ['Tenor', `${verif.tenor} bulan`],
            ['Angsuran', `${rp(scheduleOf(verif.pokok, verif.tenor)[0] ?? 0)} / bulan (tanpa jasa)`],
            ['Tujuan', verif.tujuan],
            ['Plafon tersedia', `${rp(plafon(verif.nik, verif.id).tersedia)} (${plafon(verif.nik, verif.id).kali}× simpanan wajib dikurangi pinjaman berjalan)`],
          ]}
        />
      )}
      {detail && <DetailSheet id={detail} user={user} onClose={() => setDetail(null)} />}
      {review && (
        <ReviewSheet
          open
          onOpenChange={(o) => !o && setReview(null)}
          title={`Tinjau ${review.jenis === 'koperasi' ? 'Pinjaman' : 'Pencatatan Pinjaman'} · ${review.id}`}
          description={`${empOf(review.nik)?.nama} · ${review.nik}`}
          diajukan={review.diajukan}
          oleh={review.diinputOleh}
          note={loanReviewer(review).note}
          rejectTitle={`Tolak ${review.id}?`}
          approveLabel={review.jenis === 'koperasi' ? 'Setujui' : 'Setujui Pencatatan'}
          onApprove={() => { decideLoan(review.id, true, '', loanReviewer(review).nama); toast.success(review.jenis === 'koperasi' ? `${review.id} disetujui, menunggu pencairan Bendahara` : `${review.id} dicatat dan Aktif`); setReview(null) }}
          onReject={(a) => { decideLoan(review.id, false, a, loanReviewer(review).nama); toast.success(`${review.id} ditolak`); setReview(null) }}
        >
          <LoanSummary l={review} />
          {review.jenis === 'koperasi' && <PlafonCard nik={review.nik} excludeId={review.id} />}
        </ReviewSheet>
      )}
      {cair && (
        <TransferDialog
          title={`Cairkan ${cair.id}`}
          description={`${empOf(cair.nik)?.nama} · transfer ke rekening payroll. Angsuran pertama di payroll ${periodLabel(BILL_PERIOD_IDS.find((id) => id > '2026-09' && billStateOf(id).status === 'draft') ?? '2026-11')}.${loanDisburser(cair).note ? ` ${loanDisburser(cair).note}.` : ''}`}
          nominal={cair.pokok}
          rekening={rekeningOf(cair.nik).masked}
          submitLabel="Cairkan"
          onClose={() => setCair(null)}
          onSubmit={(v) => { cairkanLoan(cair.id, v, loanDisburser(cair).nama); toast.success(`${cair.id} dicairkan dan Aktif`); setCair(null) }}
        />
      )}
    </div>
  )
}

function LoanSummary({ l }: { l: Loan }) {
  const sch = l.jenis === 'koperasi' ? scheduleOf(l.pokok, l.tenor) : []
  return (
    <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Pokok</dt><dd className="tabular-nums">{rp(l.pokok)}</dd>
      <dt className="text-muted-foreground">Tenor</dt><dd>{l.tenor} bulan</dd>
      <dt className="text-muted-foreground">Angsuran</dt><dd className="tabular-nums">{l.jenis === 'non' ? rp(l.angsuran ?? 0) : sch.length ? `${rp(sch[0])}${sch[sch.length - 1] !== sch[0] ? ` (terakhir ${rp(sch[sch.length - 1])})` : ''}` : '—'}</dd>
      <dt className="text-muted-foreground">Tujuan</dt><dd>{l.tujuan}</dd>
      {l.jenis === 'non' && (<><dt className="text-muted-foreground">Pemberi</dt><dd>{l.pemberi}</dd><dt className="text-muted-foreground">No. perjanjian</dt><dd>{l.noPerjanjian}</dd><dt className="text-muted-foreground">Mulai potong</dt><dd>Payroll {l.mulai ? periodLabel(l.mulai) : '—'}</dd></>)}
    </dl>
  )
}

function PlafonCard({ nik, excludeId }: { nik: string; excludeId?: string }) {
  const e = eligibility(nik)
  const p = plafon(nik, excludeId)
  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm tabular-nums">
      <div className="grid grid-cols-2 gap-2">
        <div><p className="text-xs text-muted-foreground">Masa keanggotaan</p><p className="font-medium">{e.bulan} bulan</p></div>
        <div><p className="text-xs text-muted-foreground">Saldo Simpanan Wajib</p><p className="font-medium">{rp(p.wajib)}</p></div>
        <div><p className="text-xs text-muted-foreground">Sisa pokok berjalan</p><p className="font-medium">{rp(p.berjalan)}</p></div>
        <div><p className="text-xs text-muted-foreground">Plafon tersedia</p><p className="font-semibold">{rp(p.tersedia)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{p.kali} × {rp(p.wajib)} − {rp(p.berjalan)} = {rp(p.tersedia)}</p>
    </div>
  )
}

function AjukanSheet({ actor, onClose }: { actor: string; onClose: () => void }) {
  const [nik, setNik] = useState('')
  const [nominal, setNominal] = useState('')
  const [tenor, setTenor] = useState('')
  const [tujuan, setTujuan] = useState('')
  const [kewajiban, setKewajiban] = useState(false)
  const [form, setForm] = useState(false)
  const [touched, setTouched] = useState(false)
  const options = useMemo(() => activeMembers().map((m) => ({ key: m.nik, label: m.nama, sub: m.department })), [])
  const n = Number(nominal || 0)
  const t = Number(tenor || 0)
  const block = nik ? loanBlock(nik) : ''
  const nomErr = nik && nominal ? loanError(nik, n, t || 1) : ''
  const sch = scheduleOf(n, t)
  const maxTenor = settingAt('pinjamanTenor')
  const errs = { nik: !nik ? 'Pilih anggota' : '', nominal: touched && !nominal ? 'Nominal wajib diisi' : nomErr, tenor: touched && !tenor ? 'Pilih tenor' : '', tujuan: touched && !tujuan ? 'Pilih tujuan' : '', cek: touched && (!kewajiban || !form) ? 'Lengkapi checklist verifikasi' : '' }
  const submit = () => {
    setTouched(true)
    if (!nik || block || !nominal || nomErr || !tenor || !tujuan || !kewajiban || !form) return
    const res = createLoan({ nik, pokok: n, tenor: t, tujuan }, actor)
    if (res.error) return toast.error(res.error)
    toast.success(`${res.id} diajukan, menunggu Ketua`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>Ajukan Pinjaman Koperasi</SheetTitle>
          <SheetDescription>Pinjaman tanpa jasa. Plafon = {settingAt('pinjamanPlafondKali')} × Saldo Simpanan Wajib − sisa pokok berjalan.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="pj-anggota" label="Anggota" required error={touched ? errs.nik : ''}>
            <CoopCombobox id="pj-anggota" value={nik} options={options} onChange={setNik} placeholder="Cari nama atau NIP…" invalid={touched && !!errs.nik} />
          </Field>
          {nik && <PlafonCard nik={nik} />}
          {block && <Alert variant="warning"><AlertDescription>{block}</AlertDescription></Alert>}
          <MoneyField id="pj-nominal" label="Nominal pinjaman" value={nominal} onChange={setNominal} error={block ? undefined : errs.nominal} />
          <Field id="pj-tenor" label="Tenor" required error={errs.tenor}>
            <Select value={tenor} onValueChange={setTenor}>
              <SelectTrigger id="pj-tenor" className="w-full"><SelectValue placeholder="Pilih tenor" /></SelectTrigger>
              <SelectContent>{Array.from({ length: maxTenor }, (_, i) => i + 1).map((x) => <SelectItem key={x} value={String(x)}>{x} bulan</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pj-tujuan" label="Tujuan" required error={errs.tujuan}>
            <Select value={tujuan} onValueChange={setTujuan}>
              <SelectTrigger id="pj-tujuan" className="w-full"><SelectValue placeholder="Pilih tujuan" /></SelectTrigger>
              <SelectContent>{TUJUAN.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {sch.length > 0 && !nomErr && !block && (
            <section className="space-y-2" aria-label="Jadwal angsuran">
              <h3 className="text-sm font-semibold">Jadwal angsuran</h3>
              <p className="text-sm tabular-nums" data-testid="angsuran">Angsuran {rp(sch[0])} × {sch.length === 1 ? 1 : sch[sch.length - 1] === sch[0] ? sch.length : sch.length - 1}{sch[sch.length - 1] !== sch[0] && sch.length > 1 ? ` + terakhir ${rp(sch[sch.length - 1])}` : ''}</p>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Ke</TableHead><TableHead className={head}>Nominal</TableHead></TableRow></TableHeader>
                  <TableBody>{sch.map((x, i) => <TableRow key={i}><TableCell className="tabular-nums">{i + 1}</TableCell><TableCell className="tabular-nums">{rp(x)}</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
              <Meta>Angsuran pertama di payroll pertama yang belum ditarik setelah pencairan.</Meta>
            </section>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Verifikasi Sekretaris</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Checkbox checked={!!nik && !block} disabled aria-label="Masa anggota" /> Masa anggota terpenuhi</li>
              <li className="flex items-center gap-2"><Checkbox checked={!!nik && !!nominal && !nomErr && !block} disabled aria-label="Dalam plafon" /> Dalam plafon</li>
              <li className="flex items-center gap-2"><Checkbox id="pj-kw" checked={kewajiban} onCheckedChange={(v) => setKewajiban(v === true)} aria-label="Kewajiban berjalan diperiksa" /><label htmlFor="pj-kw">Kewajiban berjalan sudah diperiksa</label></li>
              <li className="flex items-center gap-2"><Checkbox id="pj-fm" checked={form} onCheckedChange={(v) => setForm(v === true)} aria-label="Formulir ditandatangani" /><label htmlFor="pj-fm">Formulir ditandatangani</label></li>
            </ul>
            {errs.cek && <p className="text-sm text-danger">{errs.cek}</p>}
          </section>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={!!block}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function NonKopSheet({ actor, onClose }: { actor: string; onClose: () => void }) {
  const [nik, setNik] = useState('')
  const [pemberi, setPemberi] = useState('')
  const [no, setNo] = useState('')
  const [pokok, setPokok] = useState('')
  const [tenor, setTenor] = useState('')
  const [angsuran, setAngsuran] = useState('')
  const [mulai, setMulai] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  const options = useMemo(() => activeMembers().map((m) => ({ key: m.nik, label: m.nama, sub: m.department })), [])
  const periods = BILL_PERIOD_IDS.filter((id) => billStateOf(id).status === 'draft')
  const e = {
    nik: !nik ? 'Pilih anggota' : '', pemberi: !pemberi.trim() ? 'Pemberi wajib diisi' : '', no: !no.trim() ? 'No. perjanjian wajib diisi' : '', pokok: !pokok ? 'Nominal wajib diisi' : '',
    tenor: !tenor || Number(tenor) < 1 || Number(tenor) > 60 ? 'Tenor 1–60 bulan' : '', angsuran: !angsuran ? 'Angsuran wajib diisi' : '', mulai: !mulai ? 'Pilih periode mulai potong' : '', file: !file ? 'Lampiran perjanjian wajib' : '',
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>Catat Pinjaman Non-Koperasi</SheetTitle>
          <SheetDescription>Bukan dana koperasi. Angsuran ditagihkan ke payroll lalu disetor Bendahara ke pemberi.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="pn-anggota" label="Anggota" required error={touched ? e.nik : ''}><CoopCombobox id="pn-anggota" value={nik} options={options} onChange={setNik} placeholder="Cari nama atau NIP…" invalid={touched && !!e.nik} /></Field>
          <Field id="pn-pemberi" label="Pemberi pinjaman" required error={touched ? e.pemberi : ''}><Input id="pn-pemberi" value={pemberi} onChange={(x) => setPemberi(x.target.value)} /></Field>
          <Field id="pn-no" label="No. perjanjian" required error={touched ? e.no : ''}><Input id="pn-no" value={no} onChange={(x) => setNo(x.target.value)} /></Field>
          <MoneyField id="pn-pokok" label="Nominal pinjaman" value={pokok} onChange={setPokok} error={touched ? e.pokok : ''} />
          <Field id="pn-tenor" label="Tenor (bulan)" required error={touched ? e.tenor : ''}><Input id="pn-tenor" inputMode="numeric" value={tenor} onChange={(x) => setTenor(x.target.value.replace(/\D/g, ''))} /></Field>
          <MoneyField id="pn-angsuran" label="Angsuran per bulan" value={angsuran} onChange={setAngsuran} error={touched ? e.angsuran : ''} helper="Sesuai jadwal pemberi, boleh termasuk bunga pemberi" />
          <Field id="pn-mulai" label="Periode mulai potong" required error={touched ? e.mulai : ''}>
            <Select value={mulai} onValueChange={setMulai}>
              <SelectTrigger id="pn-mulai" className="w-full"><SelectValue placeholder="Pilih periode payroll" /></SelectTrigger>
              <SelectContent>{periods.map((id) => <SelectItem key={id} value={id}>Payroll {periodLabel(id)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pn-lamp" label="Lampiran perjanjian" required error={touched ? e.file : ''} helper="PDF atau foto, maks. 5 MB">
            <FilePicker id="pn-lamp" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('pn-lamp', true, false)} />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (Object.values(e).some(Boolean)) return
              const res = createNonKop({ nik, pemberi, noPerjanjian: no, pokok: Number(pokok), tenor: Number(tenor), angsuran: Number(angsuran), mulai, lampiran: file!.name, tujuan: 'Pinjaman pihak ketiga' }, actor)
              if (res.error) return toast.error(res.error)
              toast.success(`${res.id} dicatat, menunggu Ketua`)
              onClose()
            }}
          >
            Catat
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DetailSheet({ id, user, onClose }: { id: string; user: CurrentUser; onClose: () => void }) {
  useKoperasi()
  const l = [...koperasiLoans(), ...nonLoans()].find((x) => x.id === id)!
  const [pelunasan, setPelunasan] = useState(false)
  const [setor, setSetor] = useState<number | null>(null)
  const isSek = user.role === 'sekretaris'
  const isBend = user.role === 'bendahara'
  const mutasi = loanMutasi(l)
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>{l.id} · {empOf(l.nik)?.nama}</SheetTitle>
          <SheetDescription className="tabular-nums">{l.nik} · {LABEL[l.status]}{l.jenis === 'non' ? ' · Bukan dana koperasi' : ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-4">
          <LoanSummary l={l} />
          <div className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm tabular-nums">
            <div><p className="text-xs text-muted-foreground">Terbayar</p><p className="font-medium">{rp(paidSum(l))}</p></div>
            <div><p className="text-xs text-muted-foreground">{l.jenis === 'non' ? 'Sisa kewajiban' : 'Sisa pokok'}</p><p className="font-medium">{rp(sisaOf(l))}</p></div>
            <div><p className="text-xs text-muted-foreground">Angsuran</p><p className="font-medium">{lunasCount(l)}/{l.tenor}</p></div>
          </div>
          {l.inst.length > 0 && (
            <section className="space-y-2" aria-label="Jadwal angsuran">
              <h3 className="text-sm font-semibold">Jadwal angsuran</h3>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Ke</TableHead><TableHead className={head}>Periode payroll</TableHead><TableHead className={`text-right ${head}`}>Nominal</TableHead><TableHead className={head}>Status</TableHead>{l.jenis === 'non' && <TableHead className={head}>Setoran</TableHead>}</TableRow></TableHeader>
                  <TableBody>
                    {l.inst.map((i) => (
                      <TableRow key={i.ke}>
                        <TableCell className="tabular-nums">{i.ke}</TableCell>
                        <TableCell>{periodLabel(i.tagihPeriode)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rp(i.nominal)}</TableCell>
                        <TableCell><StatusBadge variant={INST_VARIANT[i.status]}>{INST_LABEL[i.status]}</StatusBadge></TableCell>
                        {l.jenis === 'non' && (
                          <TableCell className="text-xs">
                            {i.setoran ? `Disetor ${formatDate(i.setoran.tanggal)}` : isBend && i.status === 'lunas' ? <Button variant="outline" size="sm" onClick={() => setSetor(i.ke)}>Setor ke pemberi</Button> : '—'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
          {mutasi.length > 0 && (
            <section className="space-y-2" aria-label="Mutasi">
              <h3 className="text-sm font-semibold">Mutasi</h3>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Tanggal</TableHead><TableHead className={head}>Keterangan</TableHead><TableHead className={`text-right ${head}`}>Sisa</TableHead></TableRow></TableHeader>
                  <TableBody>{mutasi.map((m, i) => <TableRow key={i}><TableCell className="tabular-nums">{formatDate(m.tanggal)}</TableCell><TableCell>{m.keterangan}</TableCell><TableCell className="text-right tabular-nums">{rp(m.sisa)}</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </section>
          )}
          <section className="space-y-1 text-sm">
            <h3 className="text-sm font-semibold">Dokumen</h3>
            {l.lampiran && <p className="text-muted-foreground">Perjanjian: {l.lampiran}</p>}
            {l.cair && <p className="text-muted-foreground">Bukti pencairan: {l.cair.bukti} · Ref. {l.cair.ref} · {formatDate(l.cair.tanggal)}</p>}
            {l.pelunasan && <p className="text-muted-foreground">Pelunasan {l.pelunasan.metode} {rp(l.pelunasan.nominal)} · {l.pelunasan.bukti} · {l.pelunasan.status === 'dikonfirmasi' ? 'Dikonfirmasi Bendahara' : 'Menunggu konfirmasi Bendahara'}</p>}
            {!l.lampiran && !l.cair && !l.pelunasan && <p className="text-muted-foreground">Belum ada dokumen.</p>}
          </section>
        </div>
        <SheetFooter className="flex-row flex-wrap justify-end gap-2">
          {isSek && l.status === 'aktif' && !l.pelunasan && <Button variant="outline" onClick={() => setPelunasan(true)}>Pelunasan</Button>}
          {isBend && l.pelunasan?.status === 'menunggu-bendahara' && <Button onClick={() => { konfirmasiPelunasan(l.id, 'Nina Marlina'); toast.success(`${l.id} Lunas`) }}>Konfirmasi Pelunasan</Button>}
          {isSek && (l.status === 'menunggu-sekretaris' || l.status === 'menunggu-ketua' || l.status === 'disetujui') && <Button variant="outline" onClick={() => { cancelLoan(l.id, 'Dibatalkan Sekretaris', user.nama); toast.success(`${l.id} dibatalkan`) }}>Batalkan</Button>}
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </SheetFooter>
        {pelunasan && <PelunasanDialog l={l} actor={user.nama} onClose={() => setPelunasan(false)} />}
        {setor !== null && (
          <TransferDialog title={`Setor angsuran ke-${setor} ke ${l.pemberi}`} description={`${l.id} · ${l.noPerjanjian}`} nominal={l.inst.find((i) => i.ke === setor)!.nominal} submitLabel="Catat Setoran" noRef dateLabel="Tanggal setor" onClose={() => setSetor(null)} onSubmit={(v) => { setorNonKop(l.id, setor, v, 'Nina Marlina'); toast.success('Setoran ke pemberi dicatat'); setSetor(null) }} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function PelunasanDialog({ l, actor, onClose }: { l: Loan; actor: string; onClose: () => void }) {
  const [metode, setMetode] = useState<'Tunai' | 'Transfer'>('Tunai')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pelunasan dipercepat · {l.id}</DialogTitle>
          <DialogDescription>Nominal pelunasan = sisa pokok. Bendahara mengonfirmasi, lalu pinjaman Lunas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="pl-nominal" label="Nominal (sisa pokok)"><Input id="pl-nominal" readOnly value={rp(sisaOf(l))} className="bg-muted/50 tabular-nums" /></Field>
          <Field id="pl-metode" label="Metode" required>
            <Select value={metode} onValueChange={(v) => setMetode(v as 'Tunai' | 'Transfer')}>
              <SelectTrigger id="pl-metode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Tunai">Tunai</SelectItem><SelectItem value="Transfer">Transfer</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field id="pl-bukti" label="Bukti" required error={touched && !file ? 'Bukti wajib diunggah' : ''}>
            <FilePicker id="pl-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { setTouched(true); if (!file) return; catatPelunasan(l.id, { metode, bukti: file.name }, actor); toast.success('Pelunasan dicatat, menunggu konfirmasi Bendahara'); onClose() }}>Catat Pelunasan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


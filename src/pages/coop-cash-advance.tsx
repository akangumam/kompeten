import { Banknote, Clock, HandCoins, Hourglass, Info, Search, TriangleAlert } from 'lucide-react'
import { ALASAN_ERROR } from '@/lib/validators'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AlasanField, alasanOk, CoopCombobox, Meta, MoneyField, ReviewSheet, rp, SHEET_W } from '@/components/koperasi/shared'
import { TransferDialog } from '@/components/koperasi/transfer-dialog'
import { KPI_GRID, PageHeader, PersonCell, StatCard } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SourceBadge } from '@/components/mobile/source-badge'
import { VerifySheet } from '@/components/koperasi/verify-sheet'
import { appCount, kasbonChecks } from '@/data/koperasi/mobile'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  batalKasbon, bulanName, cairkanKasbon, createKasbon, decideKasbon, kasbonBlock, kasbonDisburser, kasbonError, kasbonReviewer, kasbonTotal, kasbonUsed,
  KASBON, nextOpenPeriod, periodLabel, previewAdmin, terimaTunai, TUJUAN, type Kasbon, type KasbonStatus,
} from '@/data/koperasi/loans'
import { adminIncome } from '@/data/koperasi/finance'
import { activeMembers, memberOf } from '@/data/koperasi/members'
import { empOf, rekeningOf } from '@/data/koperasi/requests'
import { settingAt } from '@/data/koperasi/settings'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const LABEL: Record<KasbonStatus, string> = {
  'menunggu-sekretaris': 'Menunggu Sekretaris', 'menunggu-ketua': 'Menunggu Ketua', disetujui: 'Disetujui, menunggu pencairan', dicairkan: 'Dicairkan', ditagihkan: 'Ditagihkan', lunas: 'Lunas', tertahan: 'Tertahan', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
}
const VARIANT: Record<KasbonStatus, 'info' | 'success' | 'danger' | 'neutral' | 'warning'> = {
  'menunggu-sekretaris': 'warning', 'menunggu-ketua': 'info', disetujui: 'info', dicairkan: 'success', ditagihkan: 'warning', lunas: 'success', tertahan: 'warning', ditolak: 'danger', dibatalkan: 'neutral',
}
const labelOf = (k: Kasbon) => (k.status === 'ditagihkan' && k.periodeTagih ? `Ditagihkan (${periodLabel(k.periodeTagih)})` : LABEL[k.status])
const closed = (k: Kasbon) => k.status === 'ditolak' || k.status === 'dibatalkan'
const MONTH_IDS = ['2026-11', '2026-10', '2026-09']

export default function CoopCashAdvancePage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const isSek = user.role === 'sekretaris'
  const isKetua = user.role === 'ketua'
  const isBend = user.role === 'bendahara'
  const [bulan, setBulan] = useState(DEMO_TODAY.slice(0, 7))
  const [q, setQ] = useState('')
  const [ajukan, setAjukan] = useState(false)
  const [review, setReview] = useState<Kasbon | null>(null)
  const [cair, setCair] = useState<Kasbon | null>(null)
  const [tunai, setTunai] = useState<Kasbon | null>(null)
  const [batal, setBatal] = useState<Kasbon | null>(null)
  const [batalAlasan, setBatalAlasan] = useState('')
  const [batalErr, setBatalErr] = useState('')
  const [detail, setDetail] = useState<Kasbon | null>(null)
  const [verif, setVerif] = useState<Kasbon | null>(null)
  const [view, setView] = useState<'aplikasi' | 'semua'>('aplikasi')

  const block = kasbonBlock()
  const nApp = appCount.kasbon()
  const showApp = isSek && nApp > 0
  const onApp = showApp && view === 'aplikasi'
  const list = KASBON.filter((k) => (onApp ? k.status === 'menunggu-sekretaris' : k.bulan === bulan) && (!q || `${empOf(k.nik)?.nama} ${k.id}`.toLowerCase().includes(q.trim().toLowerCase())))
  const inMonth = KASBON.filter((k) => k.bulan === bulan)
  const total = inMonth.filter((k) => !['ditolak', 'dibatalkan'].includes(k.status)).reduce((a, k) => a + k.nominal, 0)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Kasbon" subtitle="Kasbon bulanan anggota, dilunasi lewat potong gaji">
        <Select value={bulan} onValueChange={setBulan}>
          <SelectTrigger aria-label="Bulan" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTH_IDS.map((m) => <SelectItem key={m} value={m}>{bulanName(m)} {m.slice(0, 4)}</SelectItem>)}</SelectContent>
        </Select>
        {isSek && (
          block ? (
            <Tooltip>
              <TooltipTrigger asChild><span tabIndex={0} className="inline-flex"><Button disabled>Ajukan Kasbon</Button></span></TooltipTrigger>
              <TooltipContent>{block}</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={() => setAjukan(true)}>Ajukan Kasbon</Button>
          )
        )}
      </PageHeader>

      {block ? (
        <Alert variant="warning"><TriangleAlert /><AlertDescription>{block}</AlertDescription></Alert>
      ) : (
        <Alert variant="info"><Info /><AlertDescription>Jendela kasbon {bulanName(DEMO_TODAY.slice(0, 7))} dibuka tanggal {settingAt('kasbonJendelaDari')}–{settingAt('kasbonJendelaSampai')}. Plafon {rp(settingAt('kasbonPlafond'))} per anggota per bulan.</AlertDescription></Alert>
      )}

      <div className={KPI_GRID}>
        <StatCard label="Total kasbon bulan ini" value={rp(total)} icon={Banknote} hint={`${bulanName(bulan)} ${bulan.slice(0, 4)}`} />
        <StatCard label="Menunggu Ketua" value={inMonth.filter((k) => k.status === 'menunggu-ketua').length.toLocaleString('id-ID')} icon={Hourglass} hint="Perlu ditinjau" />
        <StatCard label="Menunggu pencairan" value={inMonth.filter((k) => k.status === 'disetujui').length.toLocaleString('id-ID')} icon={Clock} hint="Disetujui, belum dicairkan" />
        <StatCard label="Pendapatan biaya admin (terkumpul, 2026)" value={rp(adminIncome(Number(DEMO_TODAY.slice(0, 4))))} icon={HandCoins} hint="Dari buku keuangan Koperasi, untuk SHU" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          {showApp && (
            <Tabs value={view} onValueChange={(v) => setView(v as 'aplikasi' | 'semua')}>
              <TabsList>
                <TabsTrigger value="aplikasi">Dari aplikasi ({nApp})</TabsTrigger>
                <TabsTrigger value="semua">Semua kasbon</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Cari kasbon" placeholder="Cari anggota atau nomor…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>No.</TableHead>
                <TableHead className={head}>Anggota</TableHead>
                <TableHead className={`text-right ${head}`}>Nominal</TableHead>
                <TableHead className={`text-right ${head}`}>Biaya admin</TableHead>
                <TableHead className={`text-right ${head}`}>Total tagihan</TableHead>
                <TableHead className={head}>Penyelesaian</TableHead>
                <TableHead className={head}>Diajukan</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">Belum ada kasbon pada bulan ini.</TableCell></TableRow>}
              {list.map((k) => (
                <TableRow key={k.id} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium tabular-nums">{k.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <PersonCell nama={empOf(k.nik)?.nama ?? k.nik} nik={k.nik} />
                      <SourceBadge sumber={k.sumber} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rp(k.nominal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{closed(k) ? '—' : rp(k.admin)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{closed(k) ? '—' : rp(kasbonTotal(k))}</TableCell>
                  <TableCell>{k.penyelesaian === 'potong' ? 'Potong gaji' : 'Tunai ke Bendahara'}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(k.diajukan)}</TableCell>
                  <TableCell>
                    <div className="flex max-w-[220px] flex-col items-start gap-1">
                      <StatusBadge variant={VARIANT[k.status]}>{labelOf(k)}</StatusBadge>
                      {k.status === 'ditolak' && k.keputusan?.alasan && (
                        <Tooltip>
                          <TooltipTrigger asChild><span tabIndex={0} className="w-full truncate text-xs text-muted-foreground">{k.keputusan.alasan}</span></TooltipTrigger>
                          <TooltipContent className="max-w-xs">{k.keputusan.alasan}</TooltipContent>
                        </Tooltip>
                      )}
                      {k.status === 'dibatalkan' && k.batal?.alasan && (
                        <Tooltip>
                          <TooltipTrigger asChild><span tabIndex={0} className="w-full truncate text-xs text-muted-foreground">{k.batal.alasan}</span></TooltipTrigger>
                          <TooltipContent className="max-w-xs">{k.batal.alasan}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isSek && k.status === 'menunggu-sekretaris' && <Button variant="outline" size="sm" onClick={() => setVerif(k)}>Verifikasi</Button>}
                      {isKetua && k.status === 'menunggu-ketua' && <Button variant="outline" size="sm" onClick={() => setReview(k)}>Tinjau</Button>}
                      {isBend && k.status === 'disetujui' && <Button variant="outline" size="sm" onClick={() => setCair(k)}>Cairkan</Button>}
                      {isBend && k.status === 'dicairkan' && <Button variant="outline" size="sm" onClick={() => setTunai(k)}>Terima tunai</Button>}
                      {isSek && (k.status === 'menunggu-sekretaris' || k.status === 'menunggu-ketua' || k.status === 'disetujui') && <Button variant="ghost" size="sm" onClick={() => { setBatalAlasan(''); setBatal(k) }}>Batalkan</Button>}
                      {(closed(k) || k.status === 'menunggu-ketua' || k.status === 'lunas' || k.status === 'ditagihkan' || k.status === 'tertahan') && <Button variant="ghost" size="sm" onClick={() => setDetail(k)}>Detail</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {verif && (
        <VerifySheet
          kind="kasbon" id={verif.id} who={empOf(verif.nik)?.nama ?? verif.nik} diajukan={verif.diajukan} oleh={verif.diinputOleh} actor={user.nama}
          checks={kasbonChecks(verif)} onClose={() => setVerif(null)}
          rows={[
            ['Anggota', `${empOf(verif.nik)?.nama} · ${verif.nik}`],
            ['Nominal', rp(verif.nominal)],
            ['Biaya admin ' + settingAt('kasbonAdminPct') + '%', rp(verif.admin)],
            ['Total tagihan', rp(kasbonTotal(verif))],
            ['Penyelesaian', verif.penyelesaian === 'potong' ? 'Potong gaji' : 'Tunai ke Bendahara'],
            ['Tujuan', verif.tujuan + (verif.catatan ? ` · ${verif.catatan}` : '')],
            ['Plafon ' + bulanName(verif.bulan), `terpakai ${rp(kasbonUsed(verif.nik, verif.bulan))} dari ${rp(settingAt('kasbonPlafond'))}`],
          ]}
        />
      )}
      {detail && <DetailSheet k={detail} onClose={() => setDetail(null)} />}
      {ajukan && <AjukanSheet actor={user.nama} onClose={() => setAjukan(false)} />}

      {review && (
        <ReviewSheet
          open
          onOpenChange={(o) => !o && setReview(null)}
          title={`Tinjau Kasbon · ${review.id}`}
          description={`${empOf(review.nik)?.nama} · ${review.nik}`}
          diajukan={review.diajukan}
          oleh={review.diinputOleh}
          note={kasbonReviewer(review).note}
          rejectTitle={`Tolak ${review.id}?`}
          onApprove={() => { decideKasbon(review.id, true, '', kasbonReviewer(review).nama); toast.success(`${review.id} disetujui, menunggu pencairan Bendahara`); setReview(null) }}
          onReject={(a) => { decideKasbon(review.id, false, a, kasbonReviewer(review).nama); toast.success(`${review.id} ditolak`); setReview(null) }}
        >
          <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Nominal</dt><dd className="tabular-nums">{rp(review.nominal)}</dd>
            <dt className="text-muted-foreground">Biaya admin {settingAt('kasbonAdminPct')}%</dt><dd className="tabular-nums">{rp(review.admin)}</dd>
            <dt className="text-muted-foreground">Total tagihan</dt><dd className="font-medium tabular-nums">{rp(kasbonTotal(review))}</dd>
            <dt className="text-muted-foreground">Penyelesaian</dt><dd>{review.penyelesaian === 'potong' ? `Potong gaji (payroll ${periodLabel(nextOpenPeriod())})` : 'Tunai ke Bendahara'}</dd>
            <dt className="text-muted-foreground">Tujuan</dt><dd>{review.tujuan}{review.catatan ? ` · ${review.catatan}` : ''}</dd>
            <dt className="text-muted-foreground">Plafon {bulanName(review.bulan)}</dt><dd className="tabular-nums">terpakai {rp(kasbonUsed(review.nik, review.bulan))} dari {rp(settingAt('kasbonPlafond'))}</dd>
          </dl>
          <Meta>Verifikasi Sekretaris: anggota aktif, dalam jendela tanggal, dalam plafon, formulir ditandatangani.</Meta>
        </ReviewSheet>
      )}

      {cair && (
        <TransferDialog
          title={`Cairkan ${cair.id}`}
          description={`${empOf(cair.nik)?.nama} · transfer ke rekening payroll anggota.${kasbonDisburser(cair).note ? ` ${kasbonDisburser(cair).note}.` : ''}`}
          nominal={cair.nominal}
          rekening={rekeningOf(cair.nik).masked}
          submitLabel="Cairkan"
          onClose={() => setCair(null)}
          onSubmit={(v) => { cairkanKasbon(cair.id, v, kasbonDisburser(cair).nama); toast.success(`${cair.id} dicairkan ${rp(cair.nominal)}`); setCair(null) }}
        />
      )}
      {tunai && (
        <TransferDialog
          title={`Terima tunai ${tunai.id}`}
          description="Catat penerimaan tunai dari anggota beserta bukti."
          nominal={kasbonTotal(tunai)}
          submitLabel="Catat Penerimaan"
          noRef
          dateLabel="Tanggal terima"
          onClose={() => setTunai(null)}
          onSubmit={(v) => { terimaTunai(tunai.id, v, 'Nina Marlina'); toast.success(`${tunai.id} lunas (tunai)`); setTunai(null) }}
        />
      )}
      <AlertDialog open={!!batal} onOpenChange={(o) => !o && setBatal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan {batal?.id}?</AlertDialogTitle>
            <AlertDialogDescription>Plafon yang dipesan dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="batal-alasan" label="Alasan pembatalan" value={batalAlasan} onChange={(v) => { setBatalAlasan(v); setBatalErr('') }} error={batalErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => { if (!alasanOk(batalAlasan)) { e.preventDefault(); setBatalErr(ALASAN_ERROR); return } batalKasbon(batal!.id, batalAlasan.trim(), user.nama); toast.success(`${batal!.id} dibatalkan`); setBatal(null) }}>Batalkan Kasbon</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AjukanSheet({ actor, onClose }: { actor: string; onClose: () => void }) {
  const [nik, setNik] = useState('')
  const [nominal, setNominal] = useState('')
  const [tujuan, setTujuan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [pen, setPen] = useState<'potong' | 'tunai'>('potong')
  const [form, setForm] = useState(false)
  const [touched, setTouched] = useState(false)
  const options = useMemo(() => activeMembers().map((m) => ({ key: m.nik, label: m.nama, sub: m.department, reason: rekeningOf(m.nik).ada ? undefined : 'Rekening belum ada' })), [])
  const bulan = DEMO_TODAY.slice(0, 7)
  const n = Number(nominal || 0)
  const used = nik ? kasbonUsed(nik, bulan) : 0
  const plafon = settingAt('kasbonPlafond')
  const nomErr = nik && nominal ? kasbonError(nik, n) : ''
  const rek = nik ? rekeningOf(nik) : null
  const admin = previewAdmin(n)
  const errs = { nik: !nik ? 'Pilih anggota' : '', nominal: touched && !nominal ? 'Nominal wajib diisi' : nomErr, tujuan: touched && !tujuan ? 'Pilih tujuan' : '', form: touched && !form ? 'Formulir harus sudah ditandatangani' : '' }
  const checks = [
    { ok: !!nik && memberOf(nik)?.status === 'aktif', label: 'Anggota aktif' },
    { ok: !kasbonBlock(), label: 'Dalam jendela tanggal' },
    { ok: !!nik && !!nominal && !nomErr, label: 'Dalam plafon' },
    { ok: form, label: 'Formulir ditandatangani' },
  ]
  const submit = () => {
    setTouched(true)
    if (!nik || !nominal || nomErr || !tujuan || !form || (rek && !rek.ada)) return
    const res = createKasbon({ nik, nominal: n, tujuan, catatan, penyelesaian: pen }, actor)
    if (res.error) return toast.error(res.error)
    toast.success(`${res.id} diajukan. Plafon ${rp(n)} dipesan.`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>Ajukan Kasbon</SheetTitle>
          <SheetDescription>Diinput Sekretaris atas nama anggota. Plafon langsung dipesan.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="kb-anggota" label="Anggota" required error={touched ? errs.nik : ''}>
            <CoopCombobox id="kb-anggota" value={nik} options={options} onChange={setNik} placeholder="Cari nama atau NIP…" invalid={touched && !!errs.nik} />
          </Field>
          {nik && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm tabular-nums">
              Plafon {bulanName(bulan)}: {rp(plafon)} · terpakai {rp(used)} · sisa <span className="font-medium">{rp(Math.max(0, plafon - used))}</span>
            </div>
          )}
          <MoneyField id="kb-nominal" label="Nominal" value={nominal} onChange={setNominal} error={errs.nominal} helper={`Kelipatan ${rp(settingAt('kasbonStep'))}, minimal ${rp(settingAt('kasbonMin'))}`} />
          {n > 0 && (
            <p className="text-sm tabular-nums">Biaya admin {settingAt('kasbonAdminPct')}%: {rp(admin)} · Ditagihkan: <span className="font-medium">{rp(n + admin)}</span> pada payroll {periodLabel(nextOpenPeriod())}</p>
          )}
          <Field id="kb-tujuan" label="Tujuan" required error={errs.tujuan}>
            <Select value={tujuan} onValueChange={setTujuan}>
              <SelectTrigger id="kb-tujuan" className="w-full"><SelectValue placeholder="Pilih tujuan" /></SelectTrigger>
              <SelectContent>{TUJUAN.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="kb-catatan" label="Catatan" helper="Opsional"><Textarea id="kb-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
          <Field id="kb-pen" label="Penyelesaian" required>
            <RadioGroup value={pen} onValueChange={(v) => setPen(v as 'potong' | 'tunai')} className="gap-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="potong" /> Potong gaji</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="tunai" /> Tunai ke Bendahara</label>
            </RadioGroup>
          </Field>
          <Field id="kb-rek" label="Rekening tujuan" error={rek && !rek.ada ? 'Rekening belum ada. Kasbon tidak dapat dicairkan.' : ''}>
            <Input id="kb-rek" readOnly value={rek?.masked ?? '—'} className="bg-muted/50 tabular-nums" />
          </Field>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Verifikasi Sekretaris</h3>
            <ul className="space-y-2 text-sm">
              {checks.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {i === 3 ? <Checkbox id="kb-form" checked={form} onCheckedChange={(v) => setForm(v === true)} aria-label="Formulir ditandatangani" /> : <Checkbox checked={c.ok} disabled aria-label={c.label} />}
                  <label htmlFor={i === 3 ? 'kb-form' : undefined}>{c.label}</label>
                </li>
              ))}
            </ul>
            {errs.form && <p className="text-sm text-danger">{errs.form}</p>}
          </section>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DetailSheet({ k, onClose }: { k: Kasbon; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>{k.id} · {empOf(k.nik)?.nama}</SheetTitle>
          <SheetDescription>{labelOf(k)}</SheetDescription>
        </SheetHeader>
        <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 px-4 text-sm">
          <dt className="text-muted-foreground">Nominal</dt><dd className="tabular-nums">{rp(k.nominal)}</dd>
          <dt className="text-muted-foreground">Biaya admin</dt><dd className="tabular-nums">{closed(k) ? '—' : rp(k.admin)}</dd>
          <dt className="text-muted-foreground">Total tagihan</dt><dd className="tabular-nums">{closed(k) ? '—' : rp(kasbonTotal(k))}</dd>
          <dt className="text-muted-foreground">Penyelesaian</dt><dd>{k.penyelesaian === 'potong' ? 'Potong gaji' : 'Tunai ke Bendahara'}</dd>
          <dt className="text-muted-foreground">Tujuan</dt><dd>{k.tujuan}{k.catatan ? ` · ${k.catatan}` : ''}</dd>
          <dt className="text-muted-foreground">Diajukan</dt><dd>{formatDate(k.diajukan)} · {k.diinputOleh}</dd>
          {k.verif && (<><dt className="text-muted-foreground">Verifikasi Sekretaris</dt><dd>{k.verif.oleh} · {formatDate(k.verif.tanggal)}{k.verif.catatan ? ` · ${k.verif.catatan}` : ''}</dd></>)}
          {k.keputusan && (<><dt className="text-muted-foreground">Keputusan {k.keputusan.oleh === 'Ratna Dewi' ? 'Sekretaris' : 'Ketua'}</dt><dd>{k.keputusan.oleh} · {formatDate(k.keputusan.tanggal)}{k.keputusan.alasan ? ` · ${k.keputusan.alasan}` : ''}</dd></>)}
          {k.cair && (<><dt className="text-muted-foreground">Pencairan</dt><dd>{k.cair.oleh} · {formatDate(k.cair.tanggal)} · Ref. {k.cair.ref} · {k.cair.bukti}</dd></>)}
          {k.tunai && (<><dt className="text-muted-foreground">Diterima tunai</dt><dd>{k.tunai.oleh} · {formatDate(k.tunai.tanggal)} · {k.tunai.bukti}</dd></>)}
          {k.batal && (<><dt className="text-muted-foreground">Dibatalkan</dt><dd>{k.batal.oleh} · {formatDate(k.batal.tanggal)} · {k.batal.alasan}</dd></>)}
        </dl>
        <SheetFooter className="flex-row justify-end"><Button variant="outline" onClick={onClose}>Tutup</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

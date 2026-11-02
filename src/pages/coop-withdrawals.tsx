import { Banknote, Clock, HandCoins, Hourglass, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { Field } from '@/components/employee/field'
import { DisburseDialog } from '@/components/koperasi/disburse-dialog'
import { ReviewWithdrawal } from '@/components/koperasi/review-sheets'
import { AlasanField, rp, WD_LABEL, WdBadge } from '@/components/koperasi/shared'
import { WithdrawSheet } from '@/components/koperasi/withdraw-sheet'
import { KPI_GRID, PageHeader, PersonCell, StatCard } from '@/components/payroll/pay/shared'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { SourceBadge } from '@/components/mobile/source-badge'
import { VerifySheet } from '@/components/koperasi/verify-sheet'
import { appCount, wdChecks } from '@/data/koperasi/mobile'
import { memberOf } from '@/data/koperasi/members'
import {
  cancelWithdrawal, disbursedThisMonth, disburserOf, empOf, rekeningOf, RESERVING, reviewerOf, saldoSukarela, tersedia, WITHDRAWALS,
  type WdStatus, type Withdrawal,
} from '@/data/koperasi/requests'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

const head = 'text-xs font-medium text-muted-foreground'
type Pill = 'all' | 'aplikasi' | WdStatus

export default function CoopWithdrawalsPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const isSek = user.role === 'sekretaris'
  const nApp = appCount.pencairan()
  const [pill, setPill] = useState<Pill>('aplikasi')
  const [verif, setVerif] = useState<Withdrawal | null>(null)
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [ajukan, setAjukan] = useState(false)
  const [review, setReview] = useState<Withdrawal | null>(null)
  const [cairkan, setCairkan] = useState<Withdrawal | null>(null)
  const [batal, setBatal] = useState<Withdrawal | null>(null)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, q, perPage])

  const nameOf = (w: Withdrawal) => empOf(w.nik)?.nama ?? memberOf(w.nik)?.nama ?? w.nik
  const count = (s: WdStatus) => WITHDRAWALS.filter((w) => w.status === s).length
  const dipesanTotal = WITHDRAWALS.filter((w) => RESERVING.includes(w.status)).reduce((a, w) => a + w.nominal, 0)
  const showApp = isSek && nApp > 0
  const eff: Pill = pill === 'aplikasi' && !showApp ? 'all' : pill
  const list = WITHDRAWALS.filter((w) => (eff === 'all' || (eff === 'aplikasi' ? w.status === 'menunggu-sekretaris' : w.status === eff)) && (!q || `${nameOf(w)} ${w.nik} ${w.id}`.toLowerCase().includes(q)))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = list.slice(start, start + perPage)

  const caption = (w: Withdrawal) => {
    if (w.status === 'menunggu-ketua') return reviewerOf(w).note ? `Ditinjau ${reviewerOf(w).nama}` : undefined
    if (w.status === 'disetujui') return `Disetujui ${w.keputusan?.oleh} · ${formatDate(w.keputusan!.tanggal)}`
    if (w.status === 'dicairkan') return `Dicairkan ${formatDate(w.cair!.tanggal)} · Ref. ${w.cair!.ref}`
    if (w.status === 'ditolak') return w.keputusan?.alasan
    if (w.status === 'dibatalkan') return w.batal?.alasan
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Pencairan Simpanan Sukarela" subtitle="Pengajuan, persetujuan Ketua, dan pencairan oleh Bendahara">
        {isSek && <Button onClick={() => setAjukan(true)}><HandCoins /> Ajukan Pencairan</Button>}
      </PageHeader>

      <div className={KPI_GRID}>
        <StatCard label="Menunggu Ketua" value={count('menunggu-ketua').toLocaleString('id-ID')} icon={Hourglass} hint="Menunggu persetujuan" />
        <StatCard label="Menunggu pencairan" value={count('disetujui').toLocaleString('id-ID')} icon={Clock} hint="Disetujui, menunggu Bendahara" />
        <StatCard label="Dicairkan bulan ini" value={rp(disbursedThisMonth())} icon={Banknote} hint="Oktober 2026" />
        <StatCard label="Saldo dipesan" value={rp(dipesanTotal)} icon={HandCoins} hint="Belum dicairkan atau dilepas" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={eff} onValueChange={(v) => setPill(v as Pill)}>
              <TabsList className="h-auto flex-wrap justify-start">
                {showApp && <TabsTrigger value="aplikasi">Dari aplikasi ({nApp})</TabsTrigger>}
                <TabsTrigger value="all">Semua ({WITHDRAWALS.length})</TabsTrigger>
                {(['menunggu-sekretaris', 'menunggu-ketua', 'disetujui', 'dicairkan', 'ditolak', 'dibatalkan'] as WdStatus[]).map((s) => (
                  <TabsTrigger key={s} value={s}>{s === 'disetujui' ? 'Menunggu pencairan' : WD_LABEL[s]} ({count(s)})</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari pencairan" placeholder="Cari no., nama, atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>No.</TableHead>
                <TableHead className={head}>Anggota</TableHead>
                <TableHead className={`text-right ${head}`}>Nominal</TableHead>
                <TableHead className={head}>Saldo sukarela · tersedia</TableHead>
                <TableHead className={head}>Diajukan</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={head}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pencairan yang sesuai.</TableCell></TableRow>}
              {pageRows.map((w) => {
                const canReview = w.status === 'menunggu-ketua' && reviewerOf(w).role === user.role
                const canPay = w.status === 'disetujui' && disburserOf(w).role === user.role
                const canCancel = isSek && RESERVING.includes(w.status)
                const cap = caption(w)
                return (
                  <TableRow key={w.id} className="h-12 hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap font-medium tabular-nums">{w.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <PersonCell nama={nameOf(w)} nik={w.nik} />
                        <SourceBadge sumber={w.sumber} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{rp(w.nominal)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{rp(saldoSukarela(w.nik))} <span className="text-muted-foreground">· {rp(tersedia(w.nik))}</span></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(w.diajukan)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <WdBadge s={w.status} />
                        {cap && <span className="max-w-[260px] text-xs text-muted-foreground">{cap}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {isSek && w.status === 'menunggu-sekretaris' && <Button variant="outline" size="sm" onClick={() => setVerif(w)}>Verifikasi</Button>}
                        {canReview && <Button variant="outline" size="sm" onClick={() => setReview(w)}>Tinjau</Button>}
                        {canPay && <Button variant="outline" size="sm" onClick={() => setCairkan(w)}>Cairkan</Button>}
                        {canCancel && <Button variant="outline" size="sm" onClick={() => { setAlasan(''); setErr(''); setBatal(w) }}>Batalkan</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
      </Card>

      <WithdrawSheet key={String(ajukan)} open={ajukan} onOpenChange={setAjukan} actor={user.nama} />
      {verif && (
        <VerifySheet
          kind="pencairan" id={verif.id} who={nameOf(verif)} diajukan={verif.diajukan} oleh={verif.diinputOleh} actor={user.nama}
          checks={wdChecks(verif)} onClose={() => setVerif(null)}
          rows={[
            ['Anggota', `${nameOf(verif)} · ${verif.nik}`],
            ['Nominal', rp(verif.nominal)],
            ['Alasan', verif.alasan],
            ['Saldo sukarela', rp(saldoSukarela(verif.nik))],
            ['Rekening tujuan', rekeningOf(verif.nik).masked],
          ]}
        />
      )}
      <ReviewWithdrawal w={review} onClose={() => setReview(null)} actor={user.nama} />
      <DisburseDialog w={cairkan} onClose={() => setCairkan(null)} actor={user.nama} />

      <AlertDialog open={batal !== null} onOpenChange={(o) => !o && setBatal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan {batal?.id}?</AlertDialogTitle>
            <AlertDialogDescription>Saldo {batal ? rp(batal.nominal) : ''} yang dipesan langsung dilepas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="batal-alasan" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
                cancelWithdrawal(batal!.id, alasan.trim(), user.nama)
                toast.success(`${batal!.id} dibatalkan · saldo dilepas`)
                setBatal(null)
              }}
            >
              Batalkan Pencairan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

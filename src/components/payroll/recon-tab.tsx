import { Ban, CircleCheck, Landmark, Scale, Send, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PageId } from '@/App'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { GoRun, GroupSelect, KPI_GRID, NotFinal, PeriodSelect, StatCard, idr, type GroupFilter } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isConfirmed, realisasiOf } from '@/data/koperasi/realisasi'
import { defaultPeriod, disbOf, isFinal, periodRows, reconRows, recordSetoran, sendRecon, type ReconRow, type ReconStatus } from '@/data/payroll/disbursement'
import { periodById, type PeriodId, type RunCtx } from '@/data/payroll/runs'
import { usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'

function ReconBadge({ s }: { s: ReconStatus }) {
  if (s === 'cocok') return <StatusBadge variant="success"><CircleCheck aria-hidden />Cocok</StatusBadge>
  if (s === 'selisih') return <StatusBadge variant="warning"><Scale aria-hidden />Selisih</StatusBadge>
  if (s === 'menunggu') return <StatusBadge variant="info"><Wallet aria-hidden />Menunggu pembayaran gaji</StatusBadge>
  return <StatusBadge variant="warning"><Ban aria-hidden />Tertahan: gaji gagal ditransfer</StatusBadge>
}

type Props = { user: CurrentUser; ctx: RunCtx; onNavigate: (page: PageId) => void; initialPeriod?: PeriodId }

/** Rekonsiliasi Potongan: mencocokkan potongan di payroll Final dengan tagihan Koperasi. Dipakai sebagai tab dan halaman Finance. */
export function ReconPanel({ user, ctx, onNavigate, initialPeriod }: Props) {
  usePayroll()
  const [periodId, setPeriodId] = useState<PeriodId>(initialPeriod ?? defaultPeriod())
  const period = periodById(periodId)
  const final = isFinal(periodId)
  const [confirm, setConfirm] = useState(false)
  const [setoran, setSetoran] = useState(false)
  const canSend = user.role === 'payroll'
  const canSetor = user.role === 'finance'

  const [group, setGroup] = useState<GroupFilter>('all')
  const rows = useMemo(() => (final ? periodRows(periodId, ctx).filter((r) => group === 'all' || r.kelompok === group) : []), [final, periodId, ctx, group])
  const recon: ReconRow[] = final ? reconRows(periodId, rows) : []
  const d = disbOf(periodId)
  const ditagih = recon.reduce((a, r) => a + r.ditagih, 0)
  const dipotong = recon.reduce((a, r) => a + r.dipotong, 0)
  const hasSelisih = recon.some((r) => r.status === 'selisih')
  const nExplained = recon.filter((r) => r.status === 'menunggu' || r.status === 'tertahan').length

  const konf = isConfirmed(periodId) ? realisasiOf(periodId)!.konfirmasi : undefined
  const status = konf
    ? { value: 'Dikonfirmasi', hint: `Dikonfirmasi Bendahara · ${formatDate(konf.tanggal)}` }
    : d.recon.setoran
    ? { value: 'Disetor', hint: `Setoran ${formatDate(d.recon.setoran.tanggal)}` }
    : d.recon.sent
      ? { value: 'Terkirim', hint: 'Menunggu konfirmasi Bendahara Koperasi' }
      : hasSelisih
        ? { value: 'Ada selisih', hint: 'Perlu dicek sebelum dikirim' }
        : nExplained > 0
          ? { value: 'Siap dikirim', hint: `${nExplained} jenis menunggu atau tertahan` }
          : { value: 'Cocok', hint: 'Siap dikirim ke Koperasi' }

  const sendBtn = (
    <Button disabled={!!d.recon.sent || hasSelisih || group !== 'all'} title={group !== 'all' ? 'Pilih Semua Group untuk mengirim ke Koperasi' : undefined} onClick={() => setConfirm(true)}>
      <Send /> {d.recon.sent ? 'Sudah dikirim' : 'Kirim ke Koperasi'}
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Potongan Koperasi dipotong di payroll Final lalu dicocokkan dengan tagihan Koperasi.</p>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect value={periodId} onChange={setPeriodId} />
          <GroupSelect value={group} onChange={setGroup} />
        </div>
      </div>

      {!final ? (
        <NotFinal title={`Rekonsiliasi tersedia setelah payroll ${period.label} difinalisasi`} action={<GoRun onClick={() => onNavigate('payroll-run')} />} />
      ) : (
        <>
          {!canSend && !canSetor && (
            <Alert variant="info"><AlertDescription>Mode baca. Pengiriman ke Koperasi dilakukan oleh Payroll Officer.</AlertDescription></Alert>
          )}
          {konf && (
            <Alert variant="success"><AlertDescription>Dikonfirmasi Bendahara · {formatDate(konf.tanggal)}. Saldo Koperasi sudah diperbarui.</AlertDescription></Alert>
          )}
          {d.recon.sent && !konf && (
            <Alert variant="info">
              <AlertDescription>
                Terkirim · menunggu konfirmasi Bendahara Koperasi. Dikirim {d.recon.sent.by} · {d.recon.sent.at}.
              </AlertDescription>
            </Alert>
          )}

          <div className={KPI_GRID}>
            <StatCard label="Ditagihkan Koperasi" value={idr(ditagih)} icon={Landmark} hint={`Tagihan ${period.label}`} />
            <StatCard label="Dipotong di payroll" value={idr(dipotong)} icon={Wallet} hint="Dari payroll final" />
            <StatCard label="Selisih" value={idr(dipotong - ditagih)} icon={Scale} hint={dipotong === ditagih ? 'Tidak ada selisih' : 'Perlu dicek'} />
            <StatCard label="Status" value={status.value} icon={CircleCheck} hint={status.hint} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rekonsiliasi per Jenis Potongan</CardTitle>
              <CardDescription>Saldo Koperasi baru berkurang setelah payroll Final dan rekonsiliasi dikonfirmasi.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Jenis</TableHead>
                    <TableHead className={`text-right ${head}`}>Pegawai</TableHead>
                    <TableHead className={`text-right ${head}`}>Ditagihkan</TableHead>
                    <TableHead className={`text-right ${head}`}>Dipotong</TableHead>
                    <TableHead className={`text-right ${head}`}>Selisih</TableHead>
                    <TableHead className={head}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recon.map((r) => (
                    <TableRow key={r.kind} className="hover:bg-muted/50">
                      <TableCell className="py-3 align-top">
                        <p className="font-medium">{r.label}</p>
                        {r.holds.map((h) => (
                          <p key={h.nik} className="text-xs text-muted-foreground tabular-nums">{h.nama} · {idr(h.jumlah)} · {h.status === 'gagal' ? 'transfer gaji gagal' : 'gaji ditunda (rekening belum ada)'}</p>
                        ))}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">{r.pegawai.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right align-top tabular-nums">{idr(r.ditagih)}</TableCell>
                      <TableCell className="text-right align-top tabular-nums">{idr(r.dipotong)}</TableCell>
                      <TableCell className="text-right align-top tabular-nums">{idr(r.selisih)}</TableCell>
                      <TableCell className="align-top"><ReconBadge s={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold tabular-nums">{idr(ditagih)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{idr(dipotong)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{idr(dipotong - ditagih)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-xs text-muted-foreground">Saldo pinjaman, kasbon, dan simpanan diperbarui setelah dikonfirmasi Bendahara (modul Koperasi).</p>
                <div className="flex flex-wrap items-center gap-2">
                  {d.recon.setoran && (
                    <span className="text-xs text-muted-foreground tabular-nums">Disetor {formatDate(d.recon.setoran.tanggal)} oleh {d.recon.setoran.by}</span>
                  )}
                  {canSend &&
                    (hasSelisih ? (
                      <Tooltip>
                        <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md outline-none">{sendBtn}</span></TooltipTrigger>
                        <TooltipContent>Ada selisih yang belum dijelaskan</TooltipContent>
                      </Tooltip>
                    ) : (
                      sendBtn
                    ))}
                  {canSetor && (
                    <Button disabled={!!d.recon.setoran} onClick={() => setSetoran(true)}>
                      <Landmark /> {d.recon.setoran ? 'Setoran tercatat' : 'Catat Setoran ke Koperasi'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim rekonsiliasi {period.label} ke Koperasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Total dipotong {idr(dipotong)}. Status menjadi Terkirim dan menunggu konfirmasi Bendahara Koperasi.
              {nExplained > 0 && ` ${nExplained} jenis masih menunggu atau tertahan dan akan mengikuti status pembayaran gaji.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { sendRecon(periodId, user.nama, rows); toast.success('Rekonsiliasi terkirim ke Koperasi') }}>Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {setoran && <SetoranDialog total={dipotong} defaultDate={period.bayar} onClose={() => setSetoran(false)} onSave={(tanggal, bukti) => { recordSetoran(periodId, { tanggal, bukti }, user.nama); toast.success('Setoran ke Koperasi dicatat') }} />}
    </div>
  )
}

function SetoranDialog({ total, defaultDate, onClose, onSave }: { total: number; defaultDate: string; onClose: () => void; onSave: (tanggal: string, bukti: string | null) => void }) {
  const [tanggal, setTanggal] = useState(defaultDate)
  const [file, setFile] = useState<PickedFile | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Setoran ke Koperasi</DialogTitle>
          <DialogDescription>Nominal setoran sama dengan total potongan yang dipotong di payroll.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="st-tanggal" label="Tanggal setoran" required><DatePicker id="st-tanggal" value={tanggal} onChange={setTanggal} /></Field>
          <Field id="st-nominal" label="Nominal"><Input id="st-nominal" readOnly value={idr(total)} className="tabular-nums" /></Field>
          <Field id="st-bukti" label="Bukti" helper="Opsional. Foto atau PDF, maks. 5 MB">
            <FilePicker id="st-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('st-bukti', true, false)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { onSave(tanggal, file?.name ?? null); onClose() }}>Catat Setoran</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

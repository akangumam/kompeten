import { ArrowDown, ArrowUp, Info, Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { KpiStatusBadge, PredikatBadge, n1, nFmt } from '@/components/kpi/shared'
import { SHEET_720 } from '@/components/training/detail-sheet'
import { AlasanField } from '@/components/ui/alasan-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FilePicker } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DayRecord } from '@/data/attendance'
import { atasanName } from '@/data/directory'
import { ASPEK, SUMBER_LABEL } from '@/data/master/kpi'
import {
  approveKpi, approverFor, autoFromRecords, canApprove, canInput, evalKpi, mewakiliOf, monthLabel, realisasiOf, recordOf, returnKpi, saveDraft, scoreOfRow, statusOf, submitKpi, tplOfRow,
  type KpiRecord, type KpiRow,
} from '@/data/kpi/records'
import type { CurrentUser } from '@/data/users'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'

export function KpiSheet({ row, bulan, user, attendance, onClose, onNavigate }: { row: KpiRow | null; bulan: string; user: CurrentUser; attendance: DayRecord[]; onClose: () => void; onNavigate: () => void }) {
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_720}>{row && <Body key={`${row.emp.nik}|${bulan}|${statusOf(row)}`} row={row} bulan={bulan} user={user} attendance={attendance} onClose={onClose} onNavigate={onNavigate} />}</SheetContent>
    </Sheet>
  )
}

const prevMonth = (b: string) => { const [y, m] = b.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}` }
const parseNum = (s: string): number | null => {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function Body({ row, bulan, user, attendance, onClose, onNavigate }: { row: KpiRow; bulan: string; user: CurrentUser; attendance: DayRecord[]; onClose: () => void; onNavigate: () => void }) {
  const status = statusOf(row)
  const editable = canInput(user, row, bulan)
  const review = canApprove(user, row)
  const tpl = tplOfRow(row, bulan)
  const stored = realisasiOf(row, bulan, attendance)
  const [text, setText] = useState<Record<string, string>>(() => Object.fromEntries((tpl ?? []).filter((i) => i.sumber === 'manual').map((i) => [i.id, stored[i.id] == null ? '' : String(stored[i.id]).replace('.', ',')])))
  const [bukti, setBukti] = useState<KpiRecord['bukti']>(() => ({ ...(row.rec?.bukti ?? {}) }))
  const [showErr, setShowErr] = useState(false)
  const [kembali, setKembali] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [alasanErr, setAlasanErr] = useState('')

  const auto = autoFromRecords(attendance, row.emp.nik, bulan)
  const real: Record<string, number | null> = { ...stored }
  for (const i of tpl ?? []) {
    if (i.sumber === 'manual' && editable) real[i.id] = parseNum(text[i.id] ?? '')
    else if (editable && i.sumber === 'auto-hadir') real[i.id] = auto.hadir ?? stored[i.id] ?? null
    else if (editable && i.sumber === 'auto-telat') real[i.id] = auto.telat ?? stored[i.id] ?? null
  }
  const sc = evalKpi(tpl, real)
  const prevRow: KpiRow = { ...row, rec: recordOf(row.emp.nik, prevMonth(bulan)) }
  const prev = prevRow.rec ? scoreOfRow(prevRow, prevMonth(bulan), attendance) : undefined
  const ap = approverFor(row.emp)
  const wakil = mewakiliOf(user, row)
  const manualMissing = (tpl ?? []).filter((i) => i.sumber === 'manual' && real[i.id] == null)

  const manualValues = () => Object.fromEntries((tpl ?? []).filter((i) => i.sumber === 'manual').map((i) => [i.id, real[i.id] ?? null]))
  const draft = () => { saveDraft(row, bulan, manualValues(), bukti, user); toast.success('Draft KPI disimpan'); onClose() }
  const submit = () => {
    const res = submitKpi(row, bulan, manualValues(), bukti, attendance, user)
    if (res.error) { setShowErr(true); toast.error(res.error); return }
    toast.success(`KPI ${row.emp.nama} diajukan ke ${ap.nama}`)
    onClose()
  }
  const approve = () => { approveKpi(row, bulan, user); toast.success(wakil ? `KPI disetujui mewakili ${wakil}` : 'KPI disetujui dan dikunci'); onClose() }
  const kembalikan = () => {
    if (!validAlasan(alasan)) { setAlasanErr(ALASAN_ERROR); return }
    returnKpi(row, user, alasan.trim())
    toast.success('KPI dikembalikan ke Atasan')
    setKembali(false)
    onClose()
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{editable ? 'Input KPI' : review ? 'Tinjau KPI' : 'Detail KPI'}</SheetTitle>
        <SheetDescription>{row.emp.nama} · {row.posisi} · {monthLabel(bulan)}</SheetDescription>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">NIP</dt><dd className="tabular-nums">{row.emp.nik}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="pt-0.5"><KpiStatusBadge status={status} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Penilai (Atasan)</dt><dd>{row.rec?.penilai ?? atasanName(row.emp.atasanId)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Penyetuju</dt><dd>{ap.nama}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Template yang berlaku</dt><dd>{tpl ? `${row.posisi} ${bulan.slice(0, 4)}${status === 'disetujui' ? ' (snapshot saat disetujui)' : ''}` : '—'}</dd></div>
        </dl>
      </SheetHeader>

      <div className="space-y-4 p-4">
        {!tpl && <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Template KPI belum diatur untuk {row.posisi} {bulan.slice(0, 4)}. HR Development & Industrial mengaturnya di Data Master › Kompetensi › Template KPI.</AlertDescription></Alert>}
        {row.rec?.dikembalikan && status === 'dikembalikan' && <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Dikembalikan oleh {row.rec.dikembalikan.by} ({row.rec.dikembalikan.at}): {row.rec.dikembalikan.alasan}</AlertDescription></Alert>}
        {status === 'disetujui' && row.rec?.disetujui && (
          <Alert variant="success"><Lock aria-hidden /><AlertDescription>Disetujui oleh {row.rec.disetujui.by}{row.rec.disetujui.mewakili ? ` (mewakili ${row.rec.disetujui.mewakili})` : ''}, {row.rec.disetujui.at}. Template dan nilai terkunci.</AlertDescription></Alert>
        )}
        {review && wakil && <Alert variant="info"><Info aria-hidden /><AlertDescription>Anda menyetujui mewakili {wakil}.</AlertDescription></Alert>}
        {showErr && manualMissing.length > 0 && <Alert variant="destructive"><TriangleAlert aria-hidden /><AlertDescription>Semua indikator manual wajib terisi. Belum diisi: {manualMissing.map((m) => m.nama).join(', ')}.</AlertDescription></Alert>}
        {prev && prev.nilai != null && (review || status === 'diajukan') && sc.nilai != null && (
          <p className="rounded-md border bg-muted/40 p-3 text-sm tabular-nums">
            Pembanding bulan lalu ({monthLabel(prevMonth(bulan))}): <b>{n1(prev.nilai)}</b> → bulan ini <b>{n1(sc.nilai)}</b> ({sc.nilai - prev.nilai >= 0 ? '+' : '−'}{n1(Math.abs(sc.nilai - prev.nilai))})
          </p>
        )}

        {ASPEK.map((asp) => {
          const items = sc.items.filter((i) => i.ind.aspek === asp)
          if (!items.length) return null
          return (
            <section key={asp} aria-label={asp} className="space-y-2">
              <h3 className="text-sm font-semibold">{asp}</h3>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(head, 'w-[28%]')}>Indikator</TableHead>
                    <TableHead className={head}>Target</TableHead>
                    <TableHead className={cn(head, 'w-32')}>Realisasi</TableHead>
                    <TableHead className={cn(head, 'text-right')}>Capaian</TableHead>
                    <TableHead className={cn(head, 'text-right')}>Bobot</TableHead>
                    <TableHead className={cn(head, 'text-right')}>Skor</TableHead>
                    {prev && review && <TableHead className={cn(head, 'text-right')}>Bln lalu</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(({ ind, real: v, capaian, skor }) => {
                    const manual = ind.sumber === 'manual'
                    const prevItem = prev?.items.find((p) => p.ind.id === ind.id)
                    return (
                      <TableRow key={ind.id} className="hover:bg-transparent">
                        <TableCell className="align-top">
                          <p className="font-medium leading-tight">{ind.nama}</p>
                          {!manual && <p className="text-xs text-muted-foreground">{SUMBER_LABEL[ind.sumber]}</p>}
                          {manual && editable && (
                            <div className="mt-2"><FilePicker id={`bukti-${ind.id}`} accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1024 * 1024} typeError="Bukti harus PDF, JPG, atau PNG" value={bukti[ind.id] ?? null} onChange={(f) => setBukti((s) => { const n = { ...s }; if (f) n[ind.id] = f; else delete n[ind.id]; return n })} /></div>
                          )}
                          {!editable && bukti[ind.id] && <p className="mt-1 truncate text-xs text-muted-foreground">Bukti: {bukti[ind.id].name}</p>}
                        </TableCell>
                        <TableCell className="align-top text-sm tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            {ind.arah === 'naik'
                              ? <Tooltip><TooltipTrigger asChild><span tabIndex={0}><ArrowUp className="size-3.5 text-muted-foreground" aria-label="Lebih tinggi lebih baik" /></span></TooltipTrigger><TooltipContent>Lebih tinggi lebih baik</TooltipContent></Tooltip>
                              : <Tooltip><TooltipTrigger asChild><span tabIndex={0}><ArrowDown className="size-3.5 text-muted-foreground" aria-label="Lebih rendah lebih baik" /></span></TooltipTrigger><TooltipContent>Lebih rendah lebih baik</TooltipContent></Tooltip>}
                            {nFmt(ind.target)}
                          </span>
                          <span className="block text-xs text-muted-foreground">{ind.satuan}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          {manual && editable ? (
                            <Input
                              inputMode="decimal"
                              aria-label={`Realisasi ${ind.nama}`}
                              aria-invalid={(showErr && v == null) || undefined}
                              value={text[ind.id] ?? ''}
                              onChange={(e) => setText((s) => ({ ...s, [ind.id]: e.target.value }))}
                              className="text-right tabular-nums"
                            />
                          ) : (
                            <div className="text-right text-sm tabular-nums">
                              {v == null ? '—' : nFmt(v)}
                              {!manual && <button type="button" className="block w-full text-right text-xs font-medium text-primary underline underline-offset-4 hover:no-underline" onClick={onNavigate}>Lihat rekap absensi</button>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right tabular-nums">{capaian == null ? '—' : <>{n1(capaian)}%{capaian >= 120 && <span className="block text-xs text-muted-foreground">batas 120%</span>}</>}</TableCell>
                        <TableCell className="align-top text-right tabular-nums">{ind.bobot}%</TableCell>
                        <TableCell className="align-top text-right tabular-nums">{skor == null ? '—' : n1(skor)}</TableCell>
                        {prev && review && <TableCell className="align-top text-right tabular-nums text-muted-foreground">{prevItem?.capaian == null ? '—' : `${n1(prevItem.capaian)}%`}</TableCell>}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </section>
          )
        })}
      </div>

      <SheetFooter className="sticky bottom-0 mt-auto gap-3 border-t bg-background p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums" aria-live="polite">
          <span className="text-muted-foreground">Nilai total</span>
          <b className="text-lg">{sc.nilai == null ? '—' : n1(sc.nilai)}</b>
          <PredikatBadge nilai={sc.nilai} />
          <span className="text-muted-foreground">· terisi {sc.filled}/{sc.total}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{editable || review ? 'Batal' : 'Tutup'}</Button>
          {editable && <Button variant="outline" onClick={draft}>Simpan Draft</Button>}
          {editable && <Button onClick={submit}>Ajukan</Button>}
          {review && <Button variant="outline" onClick={() => { setAlasan(''); setAlasanErr(''); setKembali(true) }}>Kembalikan</Button>}
          {review && <Button onClick={approve}>Setujui</Button>}
        </div>
      </SheetFooter>

      <AlertDialog open={kembali} onOpenChange={setKembali}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan KPI ke Atasan?</AlertDialogTitle>
            <AlertDialogDescription>Status menjadi Dikembalikan dan alasan terlihat oleh penilai.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="kpi-kembali" label="Alasan pengembalian" value={alasan} onChange={setAlasan} error={alasanErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={kembalikan}>Kembalikan</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

import { Award, Info, Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AssessBadge, KIND, pctText } from '@/components/competency/shared'
import { CertificateDialog } from '@/components/training/shared'
import { certsFor, programOf, useTraining } from '@/data/training/store'
import { AlasanField } from '@/components/ui/alasan-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  assessDate, canAssess, canReview, evidenceRange, gapKind, gapLabel, pendingPositionChange, periodOf, returnAssessment, saveDraft, scoreOf, standardFor,
  statusOf, submitAssessment, verifyAssessment, type CompRow,
} from '@/data/competency/assessments'
import { atasanName } from '@/data/directory'
import { CATEGORIES, LEVELS, LEVEL_NAMES, competencyOf, targetsList } from '@/data/master/competencies'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { validAlasan } from '@/lib/validators'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
export const SHEET_720 = 'w-full gap-0 overflow-y-auto sm:max-w-[720px]'

export function AssessmentSheet({ row, periodId, user, onClose }: { row: CompRow | null; periodId: string; user: CurrentUser; onClose: () => void }) {
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_720}>{row && <Body key={`${periodId}|${row.emp.nik}|${statusOf(row)}`} row={row} periodId={periodId} user={user} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function Body({ row, periodId, user, onClose }: { row: CompRow; periodId: string; user: CurrentUser; onClose: () => void }) {
  const period = periodOf(periodId)
  const std = standardFor(row.posisi, periodId, row.a)
  const status = statusOf(row)
  const editable = canAssess(user, row, periodId) && !!std
  const reviewable = canReview(user, row, periodId)
  const [levels, setLevels] = useState<Record<string, number | null>>(() => ({ ...(row.a?.levels ?? {}) }))
  const [catatan, setCatatan] = useState<Record<string, string>>(() => ({ ...(row.a?.catatan ?? {}) }))
  const [showErr, setShowErr] = useState(false)
  const [kembali, setKembali] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [alasanErr, setAlasanErr] = useState('')
  const [cert, setCert] = useState<string | null>(null)
  useTraining()
  const ev = evidenceRange(periodId)

  const sc = scoreOf(std, levels)
  const list = targetsList(std?.targets ?? {})
  const change = pendingPositionChange(row.emp.nik)
  const penilai = row.a?.penilai ?? atasanName(row.emp.atasanId)
  const missing = list.filter((x) => levels[x.kode] == null)

  const draft = () => {
    saveDraft(periodId, row, levels, catatan, user)
    toast.success('Draft penilaian disimpan')
    onClose()
  }
  const submit = () => {
    const res = submitAssessment(periodId, row, levels, catatan, user)
    if (res.error) {
      setShowErr(true)
      toast.error(res.error)
      return
    }
    toast.success(`Penilaian ${row.emp.nama} diajukan ke Admin HRD`)
    onClose()
  }
  const verify = () => {
    verifyAssessment(periodId, row.emp.nik, user)
    toast.success('Penilaian diverifikasi dan dikunci (Final)')
    onClose()
  }
  const kembalikan = () => {
    if (!validAlasan(alasan)) { setAlasanErr('Alasan minimal 10 karakter'); return }
    returnAssessment(periodId, row.emp.nik, user, alasan.trim())
    toast.success('Penilaian dikembalikan ke Atasan')
    setKembali(false)
    onClose()
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{editable ? 'Penilaian Kompetensi' : reviewable ? 'Tinjau Penilaian Kompetensi' : 'Detail Penilaian Kompetensi'}</SheetTitle>
        <SheetDescription>{row.emp.nama} · {row.posisi} · {period.label}</SheetDescription>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">NIP</dt><dd className="tabular-nums">{row.emp.nik}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="pt-0.5"><AssessBadge status={status} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Penilai (Atasan)</dt><dd>{penilai}</dd></div>
          <div>
            <dt className="text-xs text-muted-foreground">Standar posisi yang berlaku</dt>
            <dd>{std ? <>{row.posisi} · sejak <span className="tabular-nums">{formatDate(std.berlakuMulai)}</span></> : '—'}</dd>
          </div>
        </dl>
        {std && <p className="pt-1 text-xs text-muted-foreground">Jobdesk: {std.jobdesk}</p>}
      </SheetHeader>

      <div className="space-y-4 p-4">
        {!std && (
          <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Standar belum diatur untuk posisi {row.posisi}. Penilaian belum bisa diisi.</AlertDescription></Alert>
        )}
        {change && (
          <Alert variant="info">
            <Info aria-hidden />
            <AlertDescription>
              Posisi berubah menjadi {change.posisi} mulai {formatDate(change.efektif)}{change.status === 'menunggu' ? ' (menunggu approval)' : ''}. Penilaian {period.label} memakai standar posisi pada tanggal penilaian ({formatDate(assessDate(period))}).
            </AlertDescription>
          </Alert>
        )}
        {row.a?.dikembalikan && status === 'draft' && (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertDescription>Dikembalikan oleh {row.a.dikembalikan.by} ({row.a.dikembalikan.at}): {row.a.dikembalikan.alasan}</AlertDescription>
          </Alert>
        )}
        {status === 'final' && row.a?.diverifikasi && (
          <Alert variant="success">
            <Lock aria-hidden />
            <AlertDescription>Final. Diverifikasi oleh {row.a.diverifikasi.by} pada {row.a.diverifikasi.at}. Penilaian terkunci.</AlertDescription>
          </Alert>
        )}
        {showErr && missing.length > 0 && (
          <Alert variant="destructive"><TriangleAlert aria-hidden /><AlertDescription>Semua kompetensi wajib dinilai. Belum dinilai: {missing.map((m) => m.kode).join(', ')}.</AlertDescription></Alert>
        )}

        {CATEGORIES.map((cat) => {
          const items = list.filter((x) => x.comp.kategori === cat)
          if (!items.length) return null
          return (
            <section key={cat} aria-label={cat} className="space-y-2">
              <h3 className="text-sm font-semibold">{cat}</h3>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(head, 'w-[30%]')}>Kompetensi</TableHead>
                    <TableHead className={cn(head, 'w-14 text-center')}>Target</TableHead>
                    <TableHead className={cn(head, 'w-44')}>Level aktual</TableHead>
                    <TableHead className={cn(head, 'w-24')}>Gap</TableHead>
                    <TableHead className={head}>Catatan / bukti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(({ kode, target, comp }) => {
                    const lv = levels[kode] ?? null
                    const kind = gapKind(target, lv)
                    const K = KIND[kind]
                    const Icon = K.icon
                    return (
                      <TableRow key={kode} className="hover:bg-transparent">
                        <TableCell className="align-top">
                          <p className="font-medium leading-tight">{comp.nama}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{kode}</p>
                          {certsFor(row.emp.nik, kode, ev.since, ev.until).map((c) => (
                            <button key={c.no} type="button" onClick={() => setCert(c.no)} className="mt-1 mr-1 inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium text-success hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Bukti training: lihat sertifikat ${c.no}`}>
                              <Award className="size-3" aria-hidden />Lulus {programOf(c.programKode)?.singkat} · {c.nilai} · {formatDate(c.tanggal)}
                            </button>
                          ))}
                        </TableCell>
                        <TableCell className="text-center align-top tabular-nums">{target}</TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={lv == null ? 'none' : String(lv)}
                            disabled={!editable}
                            onValueChange={(v) => setLevels((s) => ({ ...s, [kode]: v === 'none' ? null : Number(v) }))}
                          >
                            <SelectTrigger aria-label={`Level aktual ${comp.nama}`} aria-invalid={(showErr && lv == null) || undefined} className="w-full">
                              <SelectValue>{lv == null ? 'Belum dinilai' : `${lv} · ${LEVEL_NAMES[lv]}`}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Belum dinilai</SelectItem>
                              {LEVELS.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  <span className="flex flex-col items-start">
                                    <span className="font-medium">{n} · {LEVEL_NAMES[n]}</span>
                                    <span className="text-xs text-muted-foreground">{competencyOf(kode)?.deskriptor[n - 1]}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', K.text)}><Icon className="size-3.5" aria-hidden />{gapLabel(target, lv)}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            aria-label={`Catatan ${comp.nama}`}
                            value={catatan[kode] ?? ''}
                            disabled={!editable}
                            placeholder={editable ? 'Opsional' : '—'}
                            onChange={(e) => setCatatan((s) => ({ ...s, [kode]: e.target.value }))}
                          />
                        </TableCell>
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
        <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          Dinilai <b className="text-foreground">{sc.rated}/{sc.total}</b> · memenuhi <b className="text-foreground">{sc.memenuhi}</b> · total gap <b className="text-foreground">{sc.totalGap}</b> · pemenuhan <b className="text-foreground">{pctText(sc.pct)}</b>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{editable || reviewable ? 'Batal' : 'Tutup'}</Button>
          {editable && <Button variant="outline" onClick={draft}>Simpan Draft</Button>}
          {editable && <Button onClick={submit}>Ajukan</Button>}
          {reviewable && <Button variant="outline" onClick={() => { setAlasan(''); setAlasanErr(''); setKembali(true) }}>Kembalikan</Button>}
          {reviewable && <Button onClick={verify}>Verifikasi</Button>}
        </div>
      </SheetFooter>

      <CertificateDialog no={cert} onClose={() => setCert(null)} />
      <AlertDialog open={kembali} onOpenChange={setKembali}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan penilaian ke Atasan?</AlertDialogTitle>
            <AlertDialogDescription>Status menjadi Draft dan alasan terlihat oleh {penilai}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="kembali-alasan" label="Alasan pengembalian" value={alasan} onChange={setAlasan} error={alasanErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={kembalikan}>Kembalikan</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

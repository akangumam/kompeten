import { CircleCheck, Clock, Plus, Upload, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { PageHeader, PersonCell, idr } from '@/components/payroll/pay/shared'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { EmployeeCombobox } from '@/components/shift/employee-combobox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ROSTER } from '@/data/employees'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { gradeRange, salaryAt } from '@/data/payroll/salaries'
import {
  CHANGES, decide, effectiveOptions, empOf, gajiBaruError, KATEGORI, parseUpload, pct, pctText, submitBatch, submitSingle, TEMPLATE_CSV, TEMPLATE_NAME, uploadSummary,
  type ChangeStatus, type CsvRow, type SalaryChange,
} from '@/data/payroll/salary-change'
import { usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const STATUS: Record<ChangeStatus, { label: string; variant: 'info' | 'success' | 'danger'; icon: typeof Clock }> = {
  menunggu: { label: 'Menunggu Approval', variant: 'info', icon: Clock },
  disetujui: { label: 'Disetujui', variant: 'success', icon: CircleCheck },
  ditolak: { label: 'Ditolak', variant: 'danger', icon: XCircle },
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const totalOf = (c: SalaryChange) => c.items.reduce((a, i) => a + (i.baru - i.lama), 0)
const avgOf = (c: SalaryChange) => (c.items.length ? c.items.reduce((a, i) => a + pct(i.lama, i.baru), 0) / c.items.length : 0)

export default function SalaryChangePage({ user }: { user: CurrentUser }) {
  usePayroll()
  const officer = user.role === 'payroll'
  const approver = user.role === 'manager'
  const [submit, setSubmit] = useState(false)
  const [upload, setUpload] = useState(false)
  const [open, setOpen] = useState<SalaryChange | null>(null)
  const waiting = CHANGES.filter((c) => c.status === 'menunggu').length

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Perubahan Gaji" subtitle="Pengajuan perubahan Gaji Pokok. Disetujui HR & GA Manager, lalu berlaku efektif di Komponen Gaji.">
        {officer && (
          <>
            <Button variant="outline" onClick={() => setUpload(true)}><Upload /> Upload Kenaikan Serentak</Button>
            <Button onClick={() => setSubmit(true)}><Plus /> Ajukan Perubahan Gaji</Button>
          </>
        )}
      </PageHeader>

      {approver && waiting > 0 && (
        <Alert variant="info"><AlertDescription>{waiting} pengajuan menunggu persetujuan Anda.</AlertDescription></Alert>
      )}
      {!officer && !approver && <Alert variant="info"><AlertDescription>Mode baca.</AlertDescription></Alert>}

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>No</TableHead>
                <TableHead className={head}>Pegawai</TableHead>
                <TableHead className={`text-right ${head}`}>Lama → Baru</TableHead>
                <TableHead className={head}>Berlaku mulai / Sumber</TableHead>
                <TableHead className={head}>Alasan</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CHANGES.map((c) => {
                const first = c.items[0]
                const emp = empOf(first.nik)
                const batch = c.items.length > 1
                const st = STATUS[c.status]
                const groups = [...new Set(c.items.map((i) => empOf(i.nik)?.kelompok))].filter(Boolean)
                return (
                  <TableRow key={c.id} className="h-12 hover:bg-muted/50">
                    <TableCell className="font-medium tabular-nums">{c.id}</TableCell>
                    <TableCell>
                      {batch ? (
                        <div className="flex flex-col leading-tight">
                          <span className="whitespace-nowrap font-medium">{c.items.length.toLocaleString('id-ID')} pegawai</span>
                          <span className="text-xs text-muted-foreground">{groups.length > 2 ? 'Beberapa group' : groups.join(', ')}</span>
                        </div>
                      ) : emp && (
                        <PersonCell nama={emp.nama} nik={emp.nik} extra={<span className="text-xs text-muted-foreground">{emp.kelompok}</span>} />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch ? (
                        <><div className="whitespace-nowrap">+{idr(totalOf(c))}/bulan</div><div className="text-xs text-muted-foreground">rata-rata {pctText(avgOf(c))}</div></>
                      ) : (
                        <><div className="whitespace-nowrap">{idr(first.lama)} → <span className="font-medium">{idr(first.baru)}</span></div><div className="text-xs text-muted-foreground">{pctText(pct(first.lama, first.baru))}</div></>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      <div>{formatDate(first.berlaku)}</div>
                      <div className="text-xs text-muted-foreground">{c.sumber}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal">{c.kategori}</TableCell>
                    <TableCell><StatusBadge variant={st.variant}><st.icon aria-hidden />{st.label}</StatusBadge></TableCell>
                    <TableCell className="text-right">
                      {approver && c.status === 'menunggu' ? (
                        <Button variant="outline" size="sm" onClick={() => setOpen(c)}>Tinjau</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setOpen(c)}>Lihat</Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {submit && <SubmitSheet user={user} onClose={() => setSubmit(false)} />}
      {upload && <UploadDialog user={user} onClose={() => setUpload(false)} />}
      {open && <ReviewSheet change={CHANGES.find((c) => c.id === open.id)!} user={user} onClose={() => setOpen(null)} />}
    </div>
  )
}

function SubmitSheet({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const options = effectiveOptions()
  const [nik, setNik] = useState('')
  const [baru, setBaru] = useState('')
  const [berlaku, setBerlaku] = useState(options.find((o) => o.value > '2026-11-01')?.value ?? options[0]?.value ?? '')
  const [kategori, setKategori] = useState('')
  const [catatan, setCatatan] = useState('')
  const [sub, setSub] = useState(false)
  const emp = empOf(nik)
  const harian = emp?.kelompok === 'Harian'
  const lama = emp && berlaku ? salaryAt(emp, berlaku).gajiPokok : 0
  const range = emp ? gradeRange(emp.grade) : undefined
  const err = {
    nik: nik ? '' : 'Pilih pegawai',
    baru: emp && !harian ? gajiBaruError(emp, Number(baru), lama) : '',
    berlaku: berlaku ? '' : 'Berlaku mulai wajib dipilih',
    kategori: kategori ? '' : 'Pilih kategori alasan',
    catatan: catatan.trim().length >= 10 ? '' : 'Catatan minimal 10 karakter',
  }
  const save = () => {
    setSub(true)
    if (harian || Object.values(err).some(Boolean)) return
    const res = submitSingle({ nik, baru: Number(baru), berlaku, kategori, catatan }, user.nama)
    if (res.error) return toast.error(res.error)
    toast.success(`${res.id} diajukan ke HR & GA Manager`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Ajukan Perubahan Gaji</SheetTitle>
          <SheetDescription>Disetujui Lestari Wulandari sebelum masuk Komponen Gaji.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="pg-pegawai" label="Pegawai" required error={sub ? err.nik : undefined}>
            <EmployeeCombobox id="pg-pegawai" value={nik} options={ROSTER} onChange={setNik} placeholder="Pilih pegawai" emptyText="Pegawai tidak ditemukan" invalid={sub && !!err.nik} />
          </Field>
          {harian && (
            <Alert variant="info">
              <AlertDescription>Upah Harian berlaku untuk seluruh Group Harian dan diatur di Komponen Gaji. Perubahan upah per pegawai harian nanti lewat Promosi/Transaksi Pegawai.</AlertDescription>
            </Alert>
          )}
          {emp && !harian && (
            <>
              <Field id="pg-lama" label="Gaji Pokok saat ini">
                <input id="pg-lama" readOnly value={idr(lama)} className="h-9 w-full rounded-md border bg-muted/50 px-3 text-sm tabular-nums text-foreground" />
              </Field>
              <RupiahField
                id="pg-baru"
                label="Gaji Pokok baru"
                value={baru}
                error={sub || baru ? err.baru : undefined}
                helper={range ? `Rentang Grade ${emp.grade}: ${idr(range.min)} – ${idr(range.max)}` : undefined}
                onChange={setBaru}
              />
              {baru && !err.baru && <p className="text-sm text-muted-foreground tabular-nums">Perubahan {pctText(pct(lama, Number(baru)))} ({idr(Number(baru) - lama)})</p>}
            </>
          )}
          <Field id="pg-berlaku" label="Berlaku mulai" required error={sub ? err.berlaku : undefined} helper="Hari pertama periode payroll yang belum Final">
            <Select value={berlaku} onValueChange={setBerlaku}>
              <SelectTrigger id="pg-berlaku" className="w-full"><SelectValue placeholder="Pilih periode" /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pg-kategori" label="Kategori alasan" required error={sub ? err.kategori : undefined}>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger id="pg-kategori" className="w-full" aria-invalid={sub && !!err.kategori}><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>{KATEGORI.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pg-catatan" label="Catatan" required error={sub ? err.catatan : undefined} helper="Minimal 10 karakter">
            <Textarea id="pg-catatan" value={catatan} aria-invalid={sub && !!err.catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={harian}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function UploadDialog({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [headerError, setHeaderError] = useState('')
  const [drag, setDrag] = useState(false)
  const [notice, setNotice] = useState('')
  const valid = rows.filter((r) => !r.error)
  const invalid = rows.filter((r) => r.error)

  const load = async (f?: File) => {
    if (!f) return
    setFileName(f.name)
    setText(await f.text())
  }
  const preview = () => {
    const res = parseUpload(text)
    setHeaderError(res.headerError ?? '')
    if (res.headerError) return
    setRows(res.rows)
    setStep(2)
  }
  const send = () => {
    const res = submitBatch(valid, user.nama)
    if (res.duplicate) {
      setNotice(res.duplicate)
      return toast.warning(res.duplicate)
    }
    if (res.error) return toast.error(res.error)
    toast.success(`${res.id} diajukan: ${valid.length} pegawai`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upload Kenaikan Serentak · Langkah {step} dari 2</DialogTitle>
          <DialogDescription>{step === 1 ? 'Unggah CSV berisi NIP, Gaji Baru, Berlaku Mulai, dan Alasan.' : 'Periksa baris. Hanya baris valid yang diajukan sebagai satu batch.'}</DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void load(e.dataTransfer.files?.[0]) }}
              className={`flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center ${drag ? 'bg-accent' : 'bg-muted/50'}`}
            >
              <Upload className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm">Seret file CSV ke sini, atau</p>
              <label className="inline-flex">
                <input type="file" accept=".csv,text/csv" className="sr-only" aria-label="Pilih file CSV" onChange={(e) => { void load(e.target.files?.[0]); e.target.value = '' }} />
                <span className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent">Pilih file</span>
              </label>
              {fileName && <p className="text-sm tabular-nums">{fileName}</p>}
              <Button variant="link" className="h-auto p-0" onClick={() => download(TEMPLATE_NAME, TEMPLATE_CSV)}>{TEMPLATE_NAME}</Button>
            </div>
            <Field id="pg-csv-text" label="Atau tempel isi CSV" helper="Kolom: NIP, Gaji Baru, Berlaku Mulai (2026-11-24), Alasan">
              <Textarea id="pg-csv-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
            </Field>
            {headerError && <p className="text-sm text-danger">{headerError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {notice && <Alert variant="warning"><AlertDescription>{notice}</AlertDescription></Alert>}
            <p className="text-sm font-medium tabular-nums" data-testid="upload-summary">{uploadSummary(valid)}</p>
            <div className="flex gap-2 text-sm">
              <StatusBadge variant="success">{valid.length} valid</StatusBadge>
              <StatusBadge variant={invalid.length ? 'danger' : 'neutral'}>{invalid.length} tidak valid (tidak diajukan)</StatusBadge>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>NIP</TableHead>
                    <TableHead className={head}>Pegawai</TableHead>
                    <TableHead className={`text-right ${head}`}>Gaji baru</TableHead>
                    <TableHead className={head}>Berlaku</TableHead>
                    <TableHead className={head}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line} className="hover:bg-muted/50">
                      <TableCell className="tabular-nums">{r.nik}</TableCell>
                      <TableCell>{r.nama ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.baru ? idr(r.baru) : '—'}</TableCell>
                      <TableCell className="tabular-nums">{r.berlaku ? formatDate(r.berlaku) : '—'}</TableCell>
                      <TableCell>{r.error ? <StatusBadge variant="danger">{r.error}</StatusBadge> : <StatusBadge variant="success">Valid</StatusBadge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <DialogFooter>
          {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>}
          <Button variant="outline" onClick={onClose}>Batal</Button>
          {step === 1 ? <Button onClick={preview} disabled={!text.trim()}>Lanjut</Button> : <Button onClick={send} disabled={valid.length === 0}>Ajukan {valid.length} baris valid</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewSheet({ change: c, user, onClose }: { change: SalaryChange; user: CurrentUser; onClose: () => void }) {
  const canDecide = user.role === 'manager' && c.status === 'menunggu'
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  const st = STATUS[c.status]
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{canDecide ? 'Tinjau' : 'Detail'} Perubahan Gaji · {c.id}</SheetTitle>
          <SheetDescription>Diajukan oleh {c.diajukan.by} · {c.diajukan.at}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <StatusBadge variant={st.variant}><st.icon aria-hidden />{st.label}</StatusBadge>
          <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Kategori</dt><dd>{c.kategori}</dd>
            <dt className="text-muted-foreground">Catatan</dt><dd>{c.catatan}</dd>
            <dt className="text-muted-foreground">Sumber</dt><dd>{c.sumber}</dd>
          </dl>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Pegawai</TableHead>
                  <TableHead className={`text-right ${head}`}>Lama</TableHead>
                  <TableHead className={`text-right ${head}`}>Baru</TableHead>
                  <TableHead className={`text-right ${head}`}>Selisih</TableHead>
                  <TableHead className={head}>Berlaku</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.items.slice(0, 50).map((i) => (
                  <TableRow key={i.nik} className="hover:bg-muted/50">
                    <TableCell>{empOf(i.nik)?.nama}<span className="block text-xs tabular-nums text-muted-foreground">{i.nik}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{idr(i.lama)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{idr(i.baru)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pctText(pct(i.lama, i.baru))}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(i.berlaku)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {c.items.length > 50 && <p className="text-xs text-muted-foreground">Menampilkan 50 dari {c.items.length} pegawai.</p>}
          {c.keputusan && <p className="text-sm text-muted-foreground">{st.label} oleh {c.keputusan.by} · {c.keputusan.at}{c.keputusan.alasan ? ` · ${c.keputusan.alasan}` : ''}</p>}
          {c.status === 'disetujui' && <p className="text-sm text-success">Sudah tercatat di riwayat Komponen Gaji.</p>}
          {canDecide && (
            <AlasanField id="pg-tolak" label="Alasan penolakan" required={false} value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          {canDecide && (
            <>
              <Button variant="destructive" onClick={() => { if (!validAlasan(alasan)) return setErr(ALASAN_ERROR); decide(c.id, false, user.nama, alasan.trim()); toast.success(`${c.id} ditolak`); onClose() }}>Tolak</Button>
              <Button onClick={() => { decide(c.id, true, user.nama); toast.success(`${c.id} disetujui dan diterapkan di Komponen Gaji`); onClose() }}>Setujui</Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

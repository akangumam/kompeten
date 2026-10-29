import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { EmployeeMulti } from '@/components/overtime/employee-multi'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { BackButton, StepFooter, idr, type StepProps } from '@/components/payroll/run/shared'
import { EmployeeCombobox } from '@/components/shift/employee-combobox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { departments, ROSTER, sectionNames } from '@/data/employees'
import { advance, INS_DEFS, isEditable, isFinalized, removeInsidental, saveInsidental, saveInsidentalBulk, type Insidental } from '@/data/payroll/runs'
import { COMPONENTS } from '@/data/payroll/components'

const head = 'text-xs font-medium text-muted-foreground'
const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)

/** Nama komponen insidental: tiga bawaan + komponen insidental yang ditambah di Komponen Gaji (pendapatan). */
const komponenNames = () => [
  ...INS_DEFS.filter((d) => !d.final && d.nama !== 'Kompensasi PKWT').map((d) => d.nama),
  ...COMPONENTS.filter((c) => c.jenis === 'Insidental' && c.id !== 'insidental' && c.status === 'Aktif' && c.group === 'pendapatan').map((c) => c.nama),
]

type Draft = { nik: string; komponen: string; nominal: string; ket: string }

function SingleSheet({ edit, props, onClose }: { edit: Insidental | null; props: StepProps; onClose: () => void }) {
  const pool = ROSTER.filter((e) => e.kelompok === props.run.group)
  const [f, setF] = useState<Draft>(edit ? { nik: edit.nik, komponen: edit.komponen, nominal: String(edit.nominal), ket: edit.ket } : { nik: '', komponen: 'Bonus Produksi', nominal: '', ket: '' })
  const [sub, setSub] = useState(false)
  const dup = f.nik ? (props.run.insidentals.find((i) => i.nik === f.nik && i.komponen === f.komponen && i.id !== edit?.id) ? `${empOf(f.nik)?.nama} sudah memiliki ${f.komponen} periode ini.` : '') : ''
  const errs = { nik: !f.nik ? 'Pilih pegawai' : dup, nominal: !f.nominal || Number(f.nominal) <= 0 ? 'Nominal harus lebih dari 0' : '' }
  const save = () => {
    setSub(true)
    if (errs.nik || errs.nominal) return
    const msg = saveInsidental(props.run.id, { id: edit?.id, nik: f.nik, komponen: f.komponen, nominal: Number(f.nominal), ket: f.ket.trim() }, props.user.nama)
    if (msg) return toast.error(msg)
    toast.success(`${f.komponen} ${edit ? 'diperbarui' : 'ditambahkan'}`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{edit ? 'Edit Komponen Insidental' : 'Tambah Komponen Insidental'}</SheetTitle>
          <SheetDescription>Periode {props.period.label}. Satu komponen yang sama hanya sekali per pegawai.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="ins-pegawai" label="Pegawai" required error={sub || dup ? errs.nik : undefined}>
            <EmployeeCombobox id="ins-pegawai" value={f.nik} options={pool} onChange={(nik) => setF({ ...f, nik })} placeholder="Pilih pegawai" emptyText="Pegawai tidak ditemukan" invalid={!!(sub && errs.nik)} />
          </Field>
          <Field id="ins-komponen" label="Komponen" required>
            <Select value={f.komponen} onValueChange={(komponen) => setF({ ...f, komponen })}>
              <SelectTrigger id="ins-komponen" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{komponenNames().map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <RupiahField id="ins-nominal" label="Nominal" value={f.nominal} error={sub ? errs.nominal : undefined} onChange={(nominal) => setF({ ...f, nominal })} />
          <Field id="ins-ket" label="Keterangan" helper="Opsional, tampil di Rincian Gaji">
            <Textarea id="ins-ket" value={f.ket} onChange={(e) => setF({ ...f, ket: e.target.value })} />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function BulkSheet({ props, onClose }: { props: StepProps; onClose: () => void }) {
  const pool = useMemo(() => ROSTER.filter((e) => e.kelompok === props.run.group), [props.run.group])
  const [komponen, setKomponen] = useState('Bonus Produksi')
  const [nominal, setNominal] = useState('')
  const [ket, setKet] = useState('')
  const [mode, setMode] = useState<'department' | 'section' | 'pegawai'>('section')
  const [dept, setDept] = useState('Produksi')
  const [section, setSection] = useState('Injection')
  const [pilih, setPilih] = useState<string[]>([])
  const [sub, setSub] = useState(false)
  const targets = useMemo(() => {
    if (mode === 'pegawai') return pool.filter((e) => pilih.includes(e.nik))
    return pool.filter((e) => e.department === dept && (mode === 'department' || (e.section ?? e.department) === section))
  }, [mode, dept, section, pilih, pool])
  const nomErr = !nominal || Number(nominal) <= 0 ? 'Nominal harus lebih dari 0' : ''
  const tgtErr = targets.length === 0 ? 'Pilih target yang memiliki pegawai' : ''
  const dup = targets.length ? props.run.insidentals.filter((i) => i.komponen === komponen && targets.some((t) => t.nik === i.nik)) : []
  const dupMsg = dup.length ? `${empOf(dup[0].nik)?.nama} sudah memiliki ${komponen} periode ini.${dup.length > 1 ? ` (dan ${dup.length - 1} pegawai lain)` : ''}` : ''
  const save = () => {
    setSub(true)
    if (nomErr || tgtErr) return
    const msg = saveInsidentalBulk(props.run.id, targets.map((t) => t.nik), komponen, Number(nominal), ket.trim(), props.user.nama)
    if (msg) return toast.error(msg)
    toast.success(`${komponen} ditambahkan untuk ${targets.length} pegawai`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Tambah Massal</SheetTitle>
          <SheetDescription>Satu komponen untuk banyak pegawai sekaligus.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="bulk-komponen" label="Komponen" required>
            <Select value={komponen} onValueChange={setKomponen}>
              <SelectTrigger id="bulk-komponen" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{komponenNames().map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <RupiahField id="bulk-nominal" label="Nominal per pegawai" value={nominal} error={sub ? nomErr : undefined} onChange={setNominal} />
          <Field id="bulk-ket" label="Keterangan" helper="Opsional, tampil di Rincian Gaji">
            <Textarea id="bulk-ket" value={ket} onChange={(e) => setKet(e.target.value)} />
          </Field>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Target <span aria-hidden className="text-danger">*</span></legend>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="grid grid-cols-3 gap-2">
              {([['department', 'Department'], ['section', 'Section'], ['pegawai', 'Pilih pegawai']] as const).map(([v, l]) => (
                <Label key={v} htmlFor={`bulk-${v}`} className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
                  <RadioGroupItem id={`bulk-${v}`} value={v} /> {l}
                </Label>
              ))}
            </RadioGroup>
            {mode !== 'pegawai' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select value={dept} onValueChange={(v) => { setDept(v); setSection(sectionNames(v)[0] ?? '') }}>
                  <SelectTrigger aria-label="Department" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{departments().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                {mode === 'section' && (
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger aria-label="Section" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{sectionNames(dept).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            )}
            {mode === 'pegawai' && <EmployeeMulti id="bulk-pegawai" value={pilih} options={pool} onChange={setPilih} />}
          </fieldset>
          <p className="rounded-md border bg-muted/50 p-3 text-sm" aria-live="polite" data-testid="bulk-preview">
            {targets.length > 0 && Number(nominal) > 0
              ? `${targets.length.toLocaleString('id-ID')} pegawai akan menerima ${komponen} ${idr(Number(nominal))}`
              : tgtErr && sub ? tgtErr : `${targets.length.toLocaleString('id-ID')} pegawai dipilih`}
          </p>
          {dupMsg && <p className="text-sm text-danger">{dupMsg}</p>}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function StepInsidental(props: StepProps) {
  const { run, officer } = props
  const canEdit = officer && isEditable(run)
  const [sheet, setSheet] = useState<'single' | 'bulk' | null>(null)
  const [edit, setEdit] = useState<Insidental | null>(null)
  const [del, setDel] = useState<Insidental | null>(null)
  const [page, setPage] = useState(1)
  const per = 10
  const list = run.insidentals
  const pages = Math.max(1, Math.ceil(list.length / per))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * per, cur * per)

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => { setEdit(null); setSheet('single') }}>Tambah</Button>
          <Button variant="outline" onClick={() => setSheet('bulk')}>Tambah massal</Button>
        </div>
      )}
      {!canEdit && (
        <Alert variant="info">
          <AlertDescription>{isFinalized(run) ? 'Payroll sudah final; komponen insidental terkunci.' : 'Komponen insidental dikelola Payroll Officer dan terkunci setelah diajukan.'}</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={head}>Komponen</TableHead>
            <TableHead className={`text-right ${head}`}>Nominal</TableHead>
            <TableHead className={head}>Keterangan</TableHead>
            {canEdit && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center text-sm text-muted-foreground">Belum ada komponen insidental pada periode ini.</TableCell>
            </TableRow>
          )}
          {rows.map((i) => {
            const e = empOf(i.nik)
            return (
              <TableRow key={i.id} className="h-12 hover:bg-muted/50">
                <TableCell>
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium">{e?.nama}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{i.nik}</span>
                  </div>
                </TableCell>
                <TableCell>{i.komponen}</TableCell>
                <TableCell className="text-right tabular-nums">{idr(i.nominal)}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{i.ket || '—'}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Aksi ${e?.nama}`}><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setEdit(i); setSheet('single') }}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDel(i)}><Trash2 /> Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {list.length > per && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">Menampilkan {(cur - 1) * per + 1} - {Math.min(cur * per, list.length)} dari {list.length} data</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={cur === 1} onClick={() => setPage(cur - 1)}>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={cur === pages} onClick={() => setPage(cur + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}

      {canEdit && (
        <StepFooter left={<BackButton step={2} onGo={props.onGo} />}>
          <Button onClick={() => { advance(props.run.id, 3); props.onGo(3) }}>Lanjut</Button>
        </StepFooter>
      )}

      {sheet === 'single' && <SingleSheet key={edit?.id ?? 'new'} edit={edit} props={props} onClose={() => { setSheet(null); setEdit(null) }} />}
      {sheet === 'bulk' && <BulkSheet props={props} onClose={() => setSheet(null)} />}
      <AlertDialog open={del !== null} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {del?.komponen} untuk {del && empOf(del.nik)?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>Komponen ini tidak lagi dihitung di payroll {props.period.label}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { if (del) removeInsidental(props.run.id, del.id, props.user.nama); toast.success('Komponen dihapus'); setDel(null) }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

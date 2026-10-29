import { Info, Pencil, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { Field } from '@/components/employee/field'
import { FormatInput } from '@/components/employee/format-input'
import { BerlakuField } from '@/components/master/common'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import {
  entryAt, historyOf, KEPESERTAAN, membershipPeople, saveMembership, TK_PROGRAMS,
  type Kepesertaan, type Membership, type TkProgram,
} from '@/data/payroll/bpjs-membership'
import { usePayroll } from '@/data/payroll/store'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, formatError, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const VARIANT = { Aktif: 'success', 'Dalam pendaftaran': 'warning', Nonaktif: 'neutral' } as const
type Pill = 'all' | Kepesertaan

const overall = (m: Membership): Kepesertaan =>
  m.kesStatus === 'Nonaktif' || m.tkStatus === 'Nonaktif' ? 'Nonaktif' : m.kesStatus === 'Dalam pendaftaran' || m.tkStatus === 'Dalam pendaftaran' ? 'Dalam pendaftaran' : 'Aktif'
const Status = ({ s }: { s: Kepesertaan }) => <StatusBadge variant={VARIANT[s]}>{s}</StatusBadge>

export function BpjsMembershipTab({ canEdit, actor }: { canEdit: boolean; actor: string }) {
  usePayroll()
  const [pill, setPill] = useState<Pill>('all')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [edit, setEdit] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, q, perPage])

  const people = membershipPeople().map((p) => ({ ...p, entry: entryAt(p.nik, DEMO_TODAY) }))
  const count = (s: Kepesertaan) => people.filter((p) => overall(p.entry.value) === s).length
  const list = people.filter((p) => (pill === 'all' || overall(p.entry.value) === pill) && (!q || `${p.nama} ${p.nik}`.toLowerCase().includes(q)))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const rows = list.slice(start, start + perPage)
  const editing = people.find((p) => p.nik === edit)

  return (
    <div className="space-y-6">
      <Alert>
        <Info />
        <AlertDescription>Iuran dihitung hanya untuk program berstatus Aktif pada periode. Pencatatan kepesertaan tidak otomatis dilaporkan ke BPJS.</AlertDescription>
      </Alert>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={pill} onValueChange={(v) => setPill(v as Pill)}>
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="all">Semua ({people.length.toLocaleString('id-ID')})</TabsTrigger>
                {KEPESERTAAN.map((s) => <TabsTrigger key={s} value={s}>{s} ({count(s).toLocaleString('id-ID')})</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Pegawai</TableHead>
                <TableHead className={head}>BPJS Kesehatan</TableHead>
                <TableHead className={head}>BPJS Ketenagakerjaan</TableHead>
                <TableHead className={head}>Berlaku mulai</TableHead>
                <TableHead className={head}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pegawai yang sesuai.</TableCell></TableRow>}
              {rows.map((p) => {
                const m = p.entry.value
                return (
                  <TableRow key={p.nik} className="h-12 hover:bg-muted/50">
                    <TableCell><PersonCell nama={p.nama} nik={p.nik} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{m.kesNomor || <span className="text-muted-foreground">Belum ada nomor</span>}</span>
                        <Status s={m.kesStatus} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{m.tkNomor || <span className="text-muted-foreground">Belum ada nomor</span>}</span>
                        <span className="text-xs text-muted-foreground">{m.programs.length ? m.programs.join(' · ') : 'Tanpa program'}</span>
                        <Status s={m.tkStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(p.entry.berlakuMulai)}
                      {(() => {
                        const next = historyOf(p.nik).find((h) => h.berlakuMulai > DEMO_TODAY)
                        return next ? <span className="block text-xs text-muted-foreground">Berubah {formatDate(next.berlakuMulai)}</span> : null
                      })()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setEdit(p.nik)}><Pencil /> {canEdit ? 'Edit' : 'Lihat'}</Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
      </Card>
      {editing && <MembershipSheet key={editing.nik} nik={editing.nik} nama={editing.nama} canEdit={canEdit} actor={actor} onClose={() => setEdit(null)} />}
    </div>
  )
}

function MembershipSheet({ nik, nama, canEdit, actor, onClose }: { nik: string; nama: string; canEdit: boolean; actor: string; onClose: () => void }) {
  const cur = entryAt(nik, DEMO_TODAY).value
  const [kesNomor, setKesNomor] = useState(cur.kesNomor)
  const [kesStatus, setKesStatus] = useState<Kepesertaan>(cur.kesStatus)
  const [tkNomor, setTkNomor] = useState(cur.tkNomor)
  const [tkStatus, setTkStatus] = useState<Kepesertaan>(cur.tkStatus)
  const [programs, setPrograms] = useState<TkProgram[]>(cur.programs)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const [touched, setTouched] = useState({ kes: false, tk: false })
  const hist = useMemo(() => historyOf(nik).slice().reverse(), [nik, cur])

  // Nomor wajib bila status Aktif; untuk status lain boleh kosong tetapi harus valid bila diisi.
  const kesErr = kesStatus === 'Aktif' && !kesNomor ? 'No. BPJS Kesehatan wajib diisi untuk status Aktif' : formatError('bpjsKes', kesNomor)
  const tkErr = tkStatus === 'Aktif' && !tkNomor ? 'No. BPJS Ketenagakerjaan wajib diisi untuk status Aktif' : formatError('bpjsTk', tkNomor)
  const alasanErr = !validAlasan(alasan) ? ALASAN_ERROR : ''
  const dirty = kesNomor !== cur.kesNomor || kesStatus !== cur.kesStatus || tkNomor !== cur.tkNomor || tkStatus !== cur.tkStatus || programs.join() !== cur.programs.join()

  const save = () => {
    setSub(true)
    if (kesErr || tkErr || alasanErr || !berlaku) return
    if (!dirty) return toast.info('Tidak ada perubahan nilai')
    saveMembership(nik, nama, { kesNomor, kesStatus, tkNomor, tkStatus, programs: TK_PROGRAMS.filter((p) => programs.includes(p)) }, berlaku, alasan.trim(), actor)
    toast.success(`Kepesertaan BPJS ${nama} diperbarui, berlaku ${formatDate(berlaku)}`)
    onClose()
  }
  const statusSelect = (id: string, label: string, value: Kepesertaan, onChange: (s: Kepesertaan) => void) => (
    <Field id={id} label={label} required={canEdit}>
      {canEdit ? (
        <Select value={value} onValueChange={(v) => onChange(v as Kepesertaan)}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{KEPESERTAAN.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input id={id} readOnly value={value} className="bg-muted/50 text-foreground" />
      )}
    </Field>
  )

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>{canEdit ? 'Edit Kepesertaan BPJS' : 'Kepesertaan BPJS'} · {nama}</SheetTitle>
          <SheetDescription className="tabular-nums">{nik}. Iuran dihitung hanya untuk program berstatus Aktif.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <section className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">BPJS Kesehatan</h3>
            {canEdit ? (
              <FormatInput id="bk-kes" label="Nomor" rule="bpjsKes" value={kesNomor} error={sub || touched.kes ? kesErr : undefined} onChange={setKesNomor} onBlur={() => setTouched((t) => ({ ...t, kes: true }))} />
            ) : (
              <Field id="bk-kes" label="Nomor"><Input id="bk-kes" readOnly value={kesNomor || 'Belum ada nomor'} className="bg-muted/50 text-foreground tabular-nums" /></Field>
            )}
            {statusSelect('bk-kes-st', 'Status', kesStatus, setKesStatus)}
          </section>
          <section className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">BPJS Ketenagakerjaan</h3>
            {canEdit ? (
              <FormatInput id="bk-tk" label="Nomor" rule="bpjsTk" value={tkNomor} error={sub || touched.tk ? tkErr : undefined} onChange={setTkNomor} onBlur={() => setTouched((t) => ({ ...t, tk: true }))} />
            ) : (
              <Field id="bk-tk" label="Nomor"><Input id="bk-tk" readOnly value={tkNomor || 'Belum ada nomor'} className="bg-muted/50 text-foreground tabular-nums" /></Field>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Program</legend>
              <div className="flex flex-wrap gap-4">
                {TK_PROGRAMS.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox id={`bk-${p}`} disabled={!canEdit} checked={programs.includes(p)} onCheckedChange={(v) => setPrograms((cur) => (v === true ? [...cur, p] : cur.filter((x) => x !== p)))} />
                    <Label htmlFor={`bk-${p}`} className="font-normal">{p}</Label>
                  </div>
                ))}
              </div>
            </fieldset>
            {statusSelect('bk-tk-st', 'Status', tkStatus, setTkStatus)}
          </section>
          {canEdit && (
            <>
              <BerlakuField id="bk-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
              <AlasanField id="bk-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
            </>
          )}
          <section className="space-y-2" aria-label="Riwayat kepesertaan">
            <h3 className="text-sm font-semibold">Riwayat</h3>
            <ol className="space-y-2">
              {hist.map((h) => (
                <li key={h.berlakuMulai} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">Kes: {h.value.kesStatus} · TK: {h.value.tkStatus}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">Berlaku {formatDate(h.berlakuMulai)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.value.programs.length ? h.value.programs.join(' · ') : 'Tanpa program'} · {h.oleh}
                    {h.alasan ? ` · ${h.alasan}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{canEdit ? 'Batal' : 'Tutup'}</Button>
          {canEdit && <Button onClick={save}>Simpan</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

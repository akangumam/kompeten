import { Copy, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { MasterCard, type TabProps } from '@/components/master/common'
import { PredikatChip } from '@/components/kpi/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ASPEK, KPI_TEMPLATES, SUMBER_LABEL, newIndicatorId, predikatRanges, savePredikat, saveTemplate, templateOf, totalBobot, useKpiMaster,
  type Arah, type Aspek, type Indicator, type Sumber,
} from '@/data/master/kpi'
import { POSITIONS } from '@/data/master/positions'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const YEARS = [2025, 2026, 2027]
const num = (s: string) => Number(s.replace(',', '.'))

export function TemplateKpiTab({ canEdit, onHistory }: TabProps) {
  useKpiMaster()
  const [posisi, setPosisi] = useState('Operator Injection')
  const [tahun, setTahun] = useState(2026)
  const key = `${posisi}|${tahun}`
  return <TemplateEditor key={key} posisi={posisi} tahun={tahun} setPosisi={setPosisi} setTahun={setTahun} canEdit={canEdit} onHistory={onHistory} />
}

function TemplateEditor({ posisi, tahun, setPosisi, setTahun, canEdit, onHistory }: { posisi: string; tahun: number; setPosisi: (p: string) => void; setTahun: (t: number) => void } & TabProps) {
  const saved = templateOf(posisi, tahun)
  const [rows, setRows] = useState<Indicator[]>(() => (saved?.indikator ?? []).map((i) => ({ ...i })))
  const [err, setErr] = useState('')
  const [copy, setCopy] = useState(false)
  const total = totalBobot(rows)
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved?.indikator ?? [])
  const dis = !canEdit
  const patch = (id: string, p: Partial<Indicator>) => { setRows((s) => s.map((r) => (r.id === id ? { ...r, ...p } : r))); setErr('') }

  const save = () => {
    const res = saveTemplate(posisi, tahun, rows)
    if (res.error) { setErr(res.error); toast.error(res.error); return }
    setErr('')
    toast.success(`Template KPI ${posisi} ${tahun} disimpan`)
  }

  return (
    <MasterCard title="Template KPI" description="Indikator, target, arah, bobot, dan sumber data per Posisi per tahun. Total bobot wajib 100%." action={canEdit && <Button variant="outline" onClick={() => setCopy(true)}><Copy />Salin dari…</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={posisi} onValueChange={setPosisi}>
          <SelectTrigger aria-label="Posisi" className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{POSITIONS.filter((p) => p.status === 'Aktif').map((p) => <SelectItem key={p.nama} value={p.nama}>{p.nama}{KPI_TEMPLATES.some((t) => t.posisi === p.nama && t.tahun === tahun) ? '' : ' (belum ada)'}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
          <SelectTrigger aria-label="Tahun" className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {saved && <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onHistory(`Template KPI ${posisi} ${tahun}`)}>Lihat riwayat perubahan</Button>}
      </div>

      {!saved && rows.length === 0 && <Alert variant="warning"><AlertDescription>Template KPI {posisi} {tahun} belum ada. {canEdit ? 'Tambahkan indikator atau salin dari tahun/posisi lain.' : ''}</AlertDescription></Alert>}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(head, 'w-48')}>Aspek</TableHead>
            <TableHead className={head}>Indikator</TableHead>
            <TableHead className={cn(head, 'w-28')}>Satuan</TableHead>
            <TableHead className={cn(head, 'w-24')}>Target</TableHead>
            <TableHead className={cn(head, 'w-36')}>Arah</TableHead>
            <TableHead className={cn(head, 'w-24')}>Bobot %</TableHead>
            <TableHead className={cn(head, 'w-56')}>Sumber</TableHead>
            <TableHead className="w-10"><span className="sr-only">Hapus</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id} className="hover:bg-transparent">
              <TableCell>
                <Select value={r.aspek} disabled={dis} onValueChange={(v) => patch(r.id, { aspek: v as Aspek })}>
                  <SelectTrigger aria-label={`Aspek ${i + 1}`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{ASPEK.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell><Input aria-label={`Indikator ${i + 1}`} value={r.nama} disabled={dis} onChange={(e) => patch(r.id, { nama: e.target.value })} /></TableCell>
              <TableCell><Input aria-label={`Satuan ${i + 1}`} value={r.satuan} disabled={dis} onChange={(e) => patch(r.id, { satuan: e.target.value })} /></TableCell>
              <TableCell><Input aria-label={`Target ${r.nama}`} inputMode="decimal" className="text-right tabular-nums" value={String(r.target)} disabled={dis} onChange={(e) => patch(r.id, { target: num(e.target.value) || 0 })} /></TableCell>
              <TableCell>
                <Select value={r.arah} disabled={dis} onValueChange={(v) => patch(r.id, { arah: v as Arah })}>
                  <SelectTrigger aria-label={`Arah ${i + 1}`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="naik">Lebih tinggi lebih baik</SelectItem><SelectItem value="turun">Lebih rendah lebih baik</SelectItem></SelectContent>
                </Select>
              </TableCell>
              <TableCell><Input aria-label={`Bobot ${r.nama}`} inputMode="decimal" className="text-right tabular-nums" value={String(r.bobot)} disabled={dis} onChange={(e) => patch(r.id, { bobot: num(e.target.value) || 0 })} /></TableCell>
              <TableCell>
                <Select value={r.sumber} disabled={dis} onValueChange={(v) => patch(r.id, { sumber: v as Sumber })}>
                  <SelectTrigger aria-label={`Sumber ${i + 1}`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(SUMBER_LABEL) as Sumber[]).map((s) => <SelectItem key={s} value={s}>{SUMBER_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell>{canEdit && <Button variant="ghost" size="icon" aria-label={`Hapus ${r.nama}`} onClick={() => { setRows((s) => s.filter((x) => x.id !== r.id)); setErr('') }}><X /></Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="text-right text-sm font-medium">Total bobot</TableCell>
            <TableCell className={cn('text-right text-sm font-semibold tabular-nums', total === 100 ? 'text-success' : 'text-danger')} aria-live="polite">{total.toLocaleString('id-ID')}%</TableCell>
            <TableCell colSpan={2} className="text-xs text-muted-foreground">{total === 100 ? 'Siap disimpan' : `Total bobot ${total.toLocaleString('id-ID')}% (harus 100%)`}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setRows((s) => [...s, { id: newIndicatorId(), aspek: 'Sasaran Kinerja Utama', nama: '', satuan: '%', target: 100, arah: 'naik', bobot: 0, sumber: 'manual' }])}><Plus />Tambah indikator</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => { setRows((saved?.indikator ?? []).map((i) => ({ ...i }))); setErr('') }}>Batalkan perubahan</Button>
            <Button onClick={save} disabled={!dirty && !!saved}>Simpan Template</Button>
          </div>
        </div>
      )}
      <CopyDialog open={copy} onClose={() => setCopy(false)} posisi={posisi} tahun={tahun} onCopy={(ind) => { setRows(ind); setErr(''); toast.info('Indikator disalin. Periksa lalu simpan.') }} />
    </MasterCard>
  )
}

function CopyDialog({ open, onClose, posisi, tahun, onCopy }: { open: boolean; onClose: () => void; posisi: string; tahun: number; onCopy: (i: Indicator[]) => void }) {
  const sources = KPI_TEMPLATES.filter((t) => !(t.posisi === posisi && t.tahun === tahun))
  const [src, setSrc] = useState(sources[0] ? `${sources[0].posisi}|${sources[0].tahun}` : '')
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salin template</DialogTitle>
          <DialogDescription>Indikator disalin ke {posisi} {tahun}; belum tersimpan sampai Anda menekan Simpan Template.</DialogDescription>
        </DialogHeader>
        <Field id="cp-src" label="Sumber">
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger id="cp-src" className="w-full"><SelectValue placeholder="Pilih template" /></SelectTrigger>
            <SelectContent>{sources.map((t) => <SelectItem key={`${t.posisi}|${t.tahun}`} value={`${t.posisi}|${t.tahun}`}>{t.posisi} · {t.tahun}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={!src} onClick={() => { const [p, y] = src.split('|'); const t = templateOf(p, Number(y)); if (t) onCopy(t.indikator.map((i) => ({ ...i, id: newIndicatorId() }))); onClose() }}>Salin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PredikatKpiTab({ canEdit }: TabProps) {
  useKpiMaster()
  const r0 = predikatRanges()
  const f = (n: number) => String(n).replace('.', ',')
  const [v, setV] = useState({ kurangMax: f(r0.kurangMax), cukupMin: f(r0.cukupMin), cukupMax: f(r0.cukupMax), baikMin: f(r0.baikMin), baikMax: f(r0.baikMax), sangatMin: f(r0.sangatMin) })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setV({ ...v, [k]: e.target.value }); setErr('') }
  const save = () => {
    const res = savePredikat({ kurangMax: num(v.kurangMax), cukupMin: num(v.cukupMin), cukupMax: num(v.cukupMax), baikMin: num(v.baikMin), baikMax: num(v.baikMax), sangatMin: num(v.sangatMin) })
    if (res.error) { setErr(res.error); return }
    setErr('')
    toast.success('Rentang predikat KPI disimpan')
  }
  const cell = (k: keyof typeof v, label: string) => <Input aria-label={label} inputMode="decimal" className="w-28 text-right tabular-nums" value={v[k]} disabled={!canEdit} onChange={set(k)} />
  const fixed = (t: string) => <span className="inline-block w-28 pr-3 text-right text-muted-foreground tabular-nums">{t}</span>
  return (
    <MasterCard title="Predikat KPI" description="Rentang nilai tiap predikat. Rentang tidak boleh tumpang tindih dan tidak boleh ada celah (selisih 0,1 antar rentang).">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent"><TableHead className={head}>Predikat</TableHead><TableHead className={`text-right ${head}`}>Dari</TableHead><TableHead className={`text-right ${head}`}>Sampai</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="h-12"><TableCell><PredikatChip k="kurang" /></TableCell><TableCell className="text-right">{fixed('0')}</TableCell><TableCell className="text-right">{cell('kurangMax', 'Kurang sampai')}</TableCell></TableRow>
          <TableRow className="h-12"><TableCell><PredikatChip k="cukup" /></TableCell><TableCell className="text-right">{cell('cukupMin', 'Cukup dari')}</TableCell><TableCell className="text-right">{cell('cukupMax', 'Cukup sampai')}</TableCell></TableRow>
          <TableRow className="h-12"><TableCell><PredikatChip k="baik" /></TableCell><TableCell className="text-right">{cell('baikMin', 'Baik dari')}</TableCell><TableCell className="text-right">{cell('baikMax', 'Baik sampai')}</TableCell></TableRow>
          <TableRow className="h-12"><TableCell><PredikatChip k="sangat" /></TableCell><TableCell className="text-right">{cell('sangatMin', 'Sangat Baik dari')}</TableCell><TableCell className="text-right">{fixed('tanpa batas')}</TableCell></TableRow>
        </TableBody>
      </Table>
      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
      {canEdit && <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { const r = predikatRanges(); setV({ kurangMax: f(r.kurangMax), cukupMin: f(r.cukupMin), cukupMax: f(r.cukupMax), baikMin: f(r.baikMin), baikMax: f(r.baikMax), sangatMin: f(r.sangatMin) }); setErr('') }}>Batalkan perubahan</Button><Button onClick={save}>Simpan Rentang</Button></div>}
    </MasterCard>
  )
}

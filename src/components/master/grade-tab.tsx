import { Pencil } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, EditSheet, idr, MasterCard, RowMenu, UsedBy, type TabProps } from '@/components/master/common'
import { usedByGrade } from '@/components/master/stats'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { GRADES, UMK, type GradeDef } from '@/data/master/grades'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const digits = (s: string) => s.replace(/\D/g, '')
const fmt = (s: string) => (s ? `Rp ${Number(s).toLocaleString('id-ID')}` : '')

export function GradeTab({ canEdit, onHistory }: TabProps) {
  const [umk, setUmk] = useState(false)
  const [g, setG] = useState<GradeDef | null>(null)
  return (
    <div className="space-y-6">
      <MasterCard title="Grade" description="Rentang Gaji Pokok per grade">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">UMK acuan</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{idr(UMK.value)}</p>
            <p className="text-xs text-muted-foreground">Contoh. Isi sesuai keputusan UMK yang berlaku untuk lokasi pabrik.</p>
          </div>
          {canEdit && (
            <Button variant="outline" onClick={() => setUmk(true)}>
              <Pencil /> Edit UMK
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Grade</TableHead>
                <TableHead className={`text-right ${head}`}>Rentang Gaji Pokok</TableHead>
                <TableHead className={head}>Level terkait</TableHead>
                <TableHead className={`text-right ${head}`}>Jumlah pegawai</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GRADES.map((r) => (
                <TableRow key={r.kode} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{r.kode}</TableCell>
                  <TableCell className="text-right tabular-nums">{idr(r.min)} – {idr(r.max)}</TableCell>
                  <TableCell>{r.level}</TableCell>
                  <TableCell className="text-right"><UsedBy n={usedByGrade(r.kode)} preset={{ extra: { grade: r.kode } }} /></TableCell>
                  <TableCell><AktifBadge status={r.status} /></TableCell>
                  <TableCell>
                    <RowMenu
                      canEdit={canEdit}
                      status={r.status}
                      used={usedByGrade(r.kode)}
                      deletable={false}
                      onEdit={() => setG(r)}
                      onToggle={() => {
                        r.status = r.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
                        addAudit({ group: 'Grade', entitas: `Grade ${r.kode}`, perubahan: `Status ${r.kode}: ${r.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
                        bump()
                        toast.success(`Grade ${r.kode} ${r.status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}`)
                      }}
                      onHistory={() => onHistory(`Grade ${r.kode}`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>
      {umk && <UmkSheet onClose={() => setUmk(false)} />}
      {g && <GradeSheet def={g} onClose={() => setG(null)} />}
    </div>
  )
}

function UmkSheet({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState(String(UMK.value))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [sub, setSub] = useState(false)
  const bad = !v || Number(v) <= 0
  const below = GRADES.find((g) => g.kode === 'G1' && g.min < Number(v))
  return (
    <EditSheet
      title="Edit UMK acuan"
      description="UMK acuan dipakai untuk memeriksa batas bawah Grade G1."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (bad || !berlaku) return
        const old = UMK.value
        UMK.value = Number(v)
        addAudit({ group: 'Grade', entitas: 'UMK acuan', perubahan: `${idr(old)} → ${idr(UMK.value)}`, berlaku })
        bump()
        toast.success('UMK acuan diperbarui')
        onClose()
      }}
    >
      <Field id="umk" label="UMK acuan" required error={sub && bad ? 'Nominal harus lebih dari 0' : undefined} helper="Contoh: Rp 5.100.000">
        <Input id="umk" inputMode="numeric" value={fmt(v)} aria-invalid={sub && bad} onChange={(e) => setV(digits(e.target.value))} />
      </Field>
      <BerlakuField id="umk-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      {below && (
        <Alert variant="warning"><AlertDescription>Batas bawah G1 ({idr(below.min)}) akan berada di bawah UMK acuan baru.</AlertDescription></Alert>
      )}
    </EditSheet>
  )
}

function GradeSheet({ def, onClose }: { def: GradeDef; onClose: () => void }) {
  const [min, setMin] = useState(String(def.min))
  const [max, setMax] = useState(String(def.max))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [sub, setSub] = useState(false)
  const [touched, setTouched] = useState({ min: false, max: false })
  const e: { min?: string; max?: string; berlaku?: string } = {}
  if (!min || Number(min) <= 0) e.min = 'Nominal harus lebih dari 0'
  else if (def.kode === 'G1' && Number(min) < UMK.value) e.min = 'Batas bawah G1 di bawah UMK acuan'
  if (!max || Number(max) <= 0) e.max = 'Nominal harus lebih dari 0'
  else if (Number(max) <= Number(min)) e.max = 'Batas atas harus lebih besar dari batas bawah'
  if (!berlaku) e.berlaku = 'Berlaku mulai wajib diisi'
  const n = usedByGrade(def.kode)
  const outside = n > 0 && (Number(min) !== def.min || Number(max) !== def.max)
  return (
    <EditSheet
      title={`Edit Grade ${def.kode}`}
      description={`Level terkait: ${def.level}`}
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (e.min || e.max || e.berlaku) return
        addAudit({ group: 'Grade', entitas: `Grade ${def.kode}`, perubahan: `${idr(def.min)} – ${idr(def.max)} → ${idr(Number(min))} – ${idr(Number(max))}`, berlaku })
        def.min = Number(min)
        def.max = Number(max)
        bump()
        toast.success(`Grade ${def.kode} diperbarui`)
        onClose()
      }}
    >
      <Field id="g-min" label="Batas bawah Gaji Pokok" required error={sub || touched.min ? e.min : undefined} helper="Contoh: Rp 5.100.000">
        <Input id="g-min" inputMode="numeric" value={fmt(min)} aria-invalid={!!(sub || touched.min ? e.min : undefined)} onChange={(x) => setMin(digits(x.target.value))} onBlur={() => setTouched((t) => ({ ...t, min: true }))} />
      </Field>
      <Field id="g-max" label="Batas atas Gaji Pokok" required error={sub || touched.max ? e.max : undefined} helper="Contoh: Rp 5.800.000">
        <Input id="g-max" inputMode="numeric" value={fmt(max)} aria-invalid={!!(sub || touched.max ? e.max : undefined)} onChange={(x) => setMax(digits(x.target.value))} onBlur={() => setTouched((t) => ({ ...t, max: true }))} />
      </Field>
      <BerlakuField id="g-berlaku" value={berlaku} onChange={setBerlaku} error={sub ? e.berlaku : undefined} />
      {outside && (
        <Alert variant="info">
          <AlertDescription>
            {n.toLocaleString('id-ID')} pegawai memakai grade ini. Gaji pokok yang sudah tersimpan tidak berubah; rentang baru berlaku mulai {formatDate(berlaku)}.
          </AlertDescription>
        </Alert>
      )}
    </EditSheet>
  )
}

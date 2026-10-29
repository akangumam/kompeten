import { Info } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, EditSheet, MasterCard, RowMenu, type TabProps } from '@/components/master/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { APPROVER_POSITIONS, APPROVER_RULES, POSITION_NOTE, saveApprover, settingAt, type ApproverPosition, type ApproverRule } from '@/data/master/approvers'
import { bump, useMaster } from '@/data/master/store'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const NONE = 'none'

export function ApproverTab({ canEdit, onHistory }: TabProps) {
  useMaster()
  const [edit, setEdit] = useState<ApproverRule | null>(null)
  return (
    <MasterCard title="Matriks Penyetuju" description="Jabatan pengaju menentukan Penyetuju 1 dan Penyetuju 2. Dipakai oleh Cuti/Izin/Sakit/Dinas, Tukar Shift, dan Overtime.">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Jabatan pengaju</TableHead>
              <TableHead className={head}>Penyetuju 1</TableHead>
              <TableHead className={head}>Penyetuju 2 (opsional)</TableHead>
              <TableHead className={head}>Berlaku mulai</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {APPROVER_RULES.map((r) => {
              const s = settingAt(r, DEMO_TODAY)
              const cur = [...r.history].reverse().find((h) => h.berlakuMulai <= DEMO_TODAY) ?? r.history[0]
              return (
                <TableRow key={r.pengaju} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{r.pengaju}</TableCell>
                  <TableCell>{s.p1}</TableCell>
                  <TableCell>{s.p2 ?? <span className="text-muted-foreground">Tidak ada</span>}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(cur.berlakuMulai)}</TableCell>
                  <TableCell><AktifBadge status={r.status} /></TableCell>
                  <TableCell>
                    <RowMenu canEdit={canEdit} used={1} deletable={false} onEdit={() => setEdit(r)} onHistory={() => onHistory(`Penyetuju ${r.pengaju}`)} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Alert>
        <Info />
        <AlertDescription>
          Penyetuju dicari berdasarkan unit pengaju (section atau department). Verifikasi HRD untuk Sakit dan Dinas tetap menjadi langkah terpisah setelah penyetuju terakhir.
        </AlertDescription>
      </Alert>
      {edit && <ApproverSheet rule={edit} onClose={() => setEdit(null)} />}
    </MasterCard>
  )
}

function PosSelect({ id, label, value, onChange, optional, error }: { id: string; label: string; value: string; onChange: (v: string) => void; optional?: boolean; error?: string }) {
  return (
    <Field id={id} label={label} required={!optional} error={error} helper={value !== NONE ? POSITION_NOTE[value as ApproverPosition] : 'Pengajuan selesai setelah Penyetuju 1'}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error || undefined}><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>Tidak ada</SelectItem>}
          {APPROVER_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  )
}

function ApproverSheet({ rule, onClose }: { rule: ApproverRule; onClose: () => void }) {
  const cur = settingAt(rule, DEMO_TODAY)
  const [p1, setP1] = useState<string>(cur.p1)
  const [p2, setP2] = useState<string>(cur.p2 ?? NONE)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const errs = {
    p2: p2 !== NONE && p2 === p1 ? 'Penyetuju 2 tidak boleh sama dengan Penyetuju 1' : '',
    alasan: alasan.trim().length < 5 ? 'Alasan minimal 5 karakter' : '',
    berlaku: berlaku ? '' : 'Berlaku mulai wajib diisi',
  }
  const changed = p1 !== cur.p1 || (p2 === NONE ? null : p2) !== cur.p2
  const hist = [...rule.history].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai))
  return (
    <EditSheet
      title={`Edit Penyetuju · ${rule.pengaju}`}
      description="Perubahan berlaku mulai tanggal yang dipilih; pengajuan yang sudah berjalan tidak berubah."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (errs.p2 || errs.alasan || errs.berlaku) return
        if (!changed) return onClose()
        const next = { p1: p1 as ApproverPosition, p2: p2 === NONE ? null : (p2 as ApproverPosition) }
        saveApprover(rule, next, berlaku, alasan.trim())
        addAudit({ group: 'Penyetuju', entitas: `Penyetuju ${rule.pengaju}`, perubahan: `${cur.p1}${cur.p2 ? ` → ${cur.p2}` : ''} diubah menjadi ${next.p1}${next.p2 ? ` → ${next.p2}` : ''}`, berlaku })
        bump()
        toast.success(`Penyetuju ${rule.pengaju} diperbarui`)
        onClose()
      }}
    >
      <PosSelect id="ap-p1" label="Penyetuju 1" value={p1} onChange={setP1} />
      <PosSelect id="ap-p2" label="Penyetuju 2 (opsional)" value={p2} onChange={setP2} optional error={sub ? errs.p2 : undefined} />
      <BerlakuField id="ap-berlaku" value={berlaku} onChange={setBerlaku} error={sub ? errs.berlaku : undefined} />
      <AlasanField id="ap-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? errs.alasan : undefined} />
      <section className="space-y-2" aria-label="Riwayat">
        <h3 className="text-sm font-semibold">Riwayat</h3>
        <ol className="space-y-2">
          {hist.map((h) => (
            <li key={h.berlakuMulai} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{h.value.p1}{h.value.p2 ? ` → ${h.value.p2}` : ''}</span>
                <span className="text-xs tabular-nums text-muted-foreground">Berlaku {formatDate(h.berlakuMulai)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{h.oleh}{h.alasan ? ` · ${h.alasan}` : ''}</p>
            </li>
          ))}
        </ol>
      </section>
    </EditSheet>
  )
}

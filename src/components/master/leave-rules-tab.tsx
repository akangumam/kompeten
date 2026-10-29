import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { BerlakuField, EditSheet, MasterCard, type TabProps } from '@/components/master/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { LEAVE_RULES } from '@/data/master/leave-rules'
import { bump } from '@/data/master/store'
import { ROSTER } from '@/data/employees'

const head = 'text-xs font-medium text-muted-foreground'
type Edit = { kind: 'hak' } | { kind: 'syarat' } | { kind: 'khusus'; id: string } | null

function Block({ title, desc, canEdit, onEdit, onHistory, children }: { title: string; desc: string; canEdit: boolean; onEdit?: () => void; onHistory: () => void; children: React.ReactNode }) {
  return (
    <MasterCard title={title} description={desc} action={<div className="flex gap-1">{canEdit && onEdit && <Button variant="outline" size="sm" onClick={onEdit}><Pencil /> Edit</Button>}<Button variant="ghost" size="sm" onClick={onHistory}>Riwayat</Button></div>}>
      {children}
    </MasterCard>
  )
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <dt className="text-sm text-muted-foreground">{k}</dt>
    <dd className="text-sm font-medium">{v}</dd>
  </div>
)

export function LeaveRulesTab({ canEdit, onHistory }: TabProps) {
  const [ed, setEd] = useState<Edit>(null)
  const t = LEAVE_RULES.tahunan
  return (
    <div className="space-y-6">
      <Block title="Cuti Tahunan" desc="Hak dan syarat cuti tahunan" canEdit={canEdit} onEdit={() => setEd({ kind: 'hak' })} onHistory={() => onHistory('Cuti Tahunan')}>
        <dl className="divide-y">
          <Row k="Hak" v={`${t.hak} hari`} />
          <Row k="Syarat" v={`${t.syaratBulan} bulan masa kerja`} />
          <Row k="Berlaku untuk" v={<span className="flex gap-1">{t.berlaku.map((b) => <StatusBadge key={b} variant="neutral">{b}</StatusBadge>)}</span>} />
        </dl>
      </Block>
      <MasterCard title="Cuti Khusus" description="Jatah hari per sub-jenis. Tidak memotong saldo cuti tahunan.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Sub-jenis</TableHead>
                <TableHead className={`text-right ${head}`}>Jatah hari</TableHead>
                <TableHead className={head}>Potong saldo</TableHead>
                <TableHead className="w-40"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEAVE_RULES.khusus.map((k) => (
                <TableRow key={k.id} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.hari} hari</TableCell>
                  <TableCell>Tidak</TableCell>
                  <TableCell className="text-right">
                    {canEdit && <Button variant="ghost" size="sm" onClick={() => setEd({ kind: 'khusus', id: k.id })}><Pencil /> Edit</Button>}
                    <Button variant="ghost" size="sm" onClick={() => onHistory(`Cuti Khusus ${k.label}`)}>Riwayat</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>
      <Block title="Sakit" desc="Ketentuan izin sakit" canEdit={canEdit} onHistory={() => onHistory('Sakit')}>
        <dl><Row k="Surat dokter" v={LEAVE_RULES.sakit.suratDokter} /></dl>
      </Block>
      <Block title="Approval" desc="Alur persetujuan pengajuan cuti" canEdit={canEdit} onHistory={() => onHistory('Approval')}>
        <dl><Row k="Penyetuju" v={LEAVE_RULES.approval} /></dl>
      </Block>
      {ed && <LeaveSheet ed={ed} onClose={() => setEd(null)} />}
    </div>
  )
}

function LeaveSheet({ ed, onClose }: { ed: NonNullable<Edit>; onClose: () => void }) {
  const t = LEAVE_RULES.tahunan
  const kh = ed.kind === 'khusus' ? LEAVE_RULES.khusus.find((k) => k.id === ed.id)! : null
  const [a, setA] = useState(String(ed.kind === 'hak' ? t.hak : kh ? kh.hari : t.syaratBulan))
  const [b, setB] = useState(String(t.syaratBulan))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [sub, setSub] = useState(false)
  const isHak = ed.kind === 'hak'
  const eA = !a || Number(a) < 1 ? 'Isi angka lebih dari 0' : undefined
  const eB = isHak && (!b || Number(b) < 0) ? 'Isi angka 0 atau lebih' : undefined
  const eD = !berlaku ? 'Berlaku mulai wajib diisi' : undefined
  const eligible = ROSTER.length
  return (
    <EditSheet
      title={kh ? `Edit ${kh.label}` : 'Edit Cuti Tahunan'}
      description="Pengajuan yang sudah berjalan tetap memakai aturan lama."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (eA || eB || eD) return
        if (kh) {
          addAudit({ group: 'Aturan Cuti', entitas: `Cuti Khusus ${kh.label}`, perubahan: `${kh.hari} hari → ${a} hari`, berlaku })
          kh.hari = Number(a)
        } else {
          addAudit({ group: 'Aturan Cuti', entitas: 'Cuti Tahunan', perubahan: `Hak ${t.hak} → ${a} hari, syarat ${t.syaratBulan} → ${b} bulan`, berlaku })
          t.hak = Number(a)
          t.syaratBulan = Number(b)
        }
        bump()
        toast.success('Aturan cuti diperbarui')
        onClose()
      }}
    >
      <Field id="lr-a" label={kh ? 'Jatah hari' : 'Hak (hari per tahun)'} required error={sub ? eA : undefined} helper="Angka bulat">
        <Input id="lr-a" inputMode="numeric" value={a} aria-invalid={!!(sub && eA)} onChange={(x) => setA(x.target.value.replace(/\D/g, ''))} />
      </Field>
      {isHak && (
        <Field id="lr-b" label="Syarat masa kerja (bulan)" required error={sub ? eB : undefined} helper="Angka bulat">
          <Input id="lr-b" inputMode="numeric" value={b} aria-invalid={!!(sub && eB)} onChange={(x) => setB(x.target.value.replace(/\D/g, ''))} />
        </Field>
      )}
      <BerlakuField id="lr-berlaku" value={berlaku} onChange={setBerlaku} error={sub ? eD : undefined} />
      {isHak && <p className="text-sm text-muted-foreground">Berdampak pada hingga {eligible.toLocaleString('id-ID')} pegawai.</p>}
    </EditSheet>
  )
}

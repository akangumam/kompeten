import { Plus } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { ConfirmDialog, EditSheet, MasterCard, type TabProps } from '@/components/master/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ROSTER } from '@/data/employees'
import { hakPeriode } from '@/data/leave'
import { addAudit } from '@/data/master/audit-log'
import { dayNameOf, HOLIDAYS, type Holiday } from '@/data/master/holidays'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'

const affectedCount = (iso: string) =>
  ROSTER.filter((e) => {
    const hp = hakPeriode(e)
    return hp && iso >= hp.start && iso <= hp.end
  }).length

export function HolidayTab({ canEdit }: TabProps) {
  const [year, setYear] = useState('2026')
  const [target, setTarget] = useState<Holiday | null>(null)
  const [add, setAdd] = useState(false)
  const rows = HOLIDAYS.filter((h) => h.tanggal.startsWith(year)).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const n = target ? affectedCount(target.tanggal) : 0

  return (
    <MasterCard
      title="Kalender Libur"
      description="Libur nasional, cuti bersama, dan libur perusahaan"
      action={canEdit && <Button onClick={() => setAdd(true)}><Plus /> Tambah Libur</Button>}
    >
      <div className="flex items-center gap-2">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32" aria-label="Tahun"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
        </Select>
      </div>
      <Alert variant="info">
        <AlertDescription>
          Cuti bersama dari pemerintah bersifat pilihan bagi perusahaan swasta. Yang diberlakukan memotong saldo cuti tahunan pegawai.
        </AlertDescription>
      </Alert>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Tanggal</TableHead>
              <TableHead className={head}>Hari</TableHead>
              <TableHead className={head}>Keterangan</TableHead>
              <TableHead className={head}>Jenis</TableHead>
              <TableHead className={head}>Diberlakukan</TableHead>
              <TableHead className={head}>Potong saldo cuti</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((h) => {
              const past = h.tanggal < DEMO_TODAY
              return (
                <TableRow key={h.tanggal + h.ket} className="h-12 hover:bg-muted/50">
                  <TableCell className="tabular-nums">{formatDate(h.tanggal)}</TableCell>
                  <TableCell>{dayNameOf(h.tanggal)}</TableCell>
                  <TableCell>{h.ket}</TableCell>
                  <TableCell><StatusBadge variant={h.jenis === 'Libur Nasional' ? 'info' : 'neutral'}>{h.jenis}</StatusBadge></TableCell>
                  <TableCell>
                    {h.jenis === 'Cuti Bersama' ? (
                      <div className="flex items-center gap-2">
                        {past ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Switch checked={h.diberlakukan} disabled aria-label={`Diberlakukan: ${h.ket}`} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Tanggal sudah lewat</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch checked={h.diberlakukan} disabled={!canEdit} aria-label={`Diberlakukan: ${h.ket}`} onCheckedChange={() => setTarget(h)} />
                        )}
                        <span className="text-sm text-muted-foreground">{h.diberlakukan ? 'Ya' : 'Tidak'}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Selalu</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.jenis === 'Cuti Bersama' && h.diberlakukan ? <span className="text-foreground">Ya</span> : '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target ? `${target.diberlakukan ? 'Batalkan' : 'Berlakukan'} cuti bersama ${formatDate(target.tanggal)}?` : ''}
        description={
          target?.diberlakukan
            ? `Saldo cuti tahunan ${n.toLocaleString('id-ID')} pegawai kembali 1 hari.`
            : `Saldo cuti tahunan ${n.toLocaleString('id-ID')} pegawai berkurang 1 hari.`
        }
        confirmLabel={target?.diberlakukan ? 'Batalkan' : 'Berlakukan'}
        onConfirm={() => {
          if (!target) return
          target.diberlakukan = !target.diberlakukan
          addAudit({
            group: 'Kalender Libur',
            entitas: 'Kalender Libur',
            perubahan: `Cuti bersama ${formatDate(target.tanggal)}: ${target.diberlakukan ? 'Tidak → Diberlakukan' : 'Diberlakukan → Tidak'}`,
            berlaku: DEMO_TODAY,
          })
          bump()
          toast.success(`Cuti bersama ${formatDate(target.tanggal)} ${target.diberlakukan ? 'diberlakukan' : 'dibatalkan'}`)
          setTarget(null)
        }}
      />
      {add && <AddHoliday onClose={() => setAdd(false)} />}
    </MasterCard>
  )
}

function AddHoliday({ onClose }: { onClose: () => void }) {
  const [tgl, setTgl] = useState('')
  const [ket, setKet] = useState('')
  const [sub, setSub] = useState(false)
  const e: { tgl?: string; ket?: string } = {}
  if (!tgl) e.tgl = 'Tanggal wajib diisi'
  else if (tgl < DEMO_TODAY) e.tgl = 'Tanggal tidak boleh sudah lewat'
  else if (HOLIDAYS.some((h) => h.tanggal === tgl)) e.tgl = 'Tanggal sudah ada di kalender'
  if (ket.trim().length < 3) e.ket = 'Keterangan wajib diisi'
  return (
    <EditSheet
      title="Tambah Libur Perusahaan"
      description="Libur perusahaan tidak memotong saldo cuti tahunan."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (e.tgl || e.ket) return
        HOLIDAYS.push({ tanggal: tgl, ket: ket.trim(), jenis: 'Libur Perusahaan', diberlakukan: true })
        addAudit({ group: 'Kalender Libur', entitas: 'Kalender Libur', perubahan: `Menambah libur perusahaan ${formatDate(tgl)}: ${ket.trim()}`, berlaku: tgl })
        bump()
        toast.success('Libur perusahaan ditambahkan')
        onClose()
      }}
    >
      <Field id="lib-tgl" label="Tanggal" required error={sub ? e.tgl : undefined}>
        <DatePicker id="lib-tgl" value={tgl} onChange={setTgl} invalid={!!(sub && e.tgl)} />
      </Field>
      <Field id="lib-ket" label="Keterangan" required error={sub ? e.ket : undefined} helper="Contoh: Ulang Tahun Perusahaan">
        <Input id="lib-ket" value={ket} onChange={(x) => setKet(x.target.value)} aria-invalid={!!(sub && e.ket)} />
      </Field>
    </EditSheet>
  )
}

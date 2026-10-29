import { Pencil } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useState } from 'react'
import { toast } from 'sonner'
import { SickCategoryCard } from '@/components/master/sick-category-card'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, EditSheet, MasterCard, RowMenu, UsedBy, type TabProps } from '@/components/master/common'
import { usedByPola, usedByShift } from '@/components/master/stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nextPeriodStart, RULE_LABEL, RULES, rule, ruleText, type RuleKey } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { POLA_DEFS, SHIFT_DEFS, shiftDuration, toMinutes, type ShiftDef } from '@/data/master/shifts'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const RULE_KEYS: RuleKey[] = ['toleransi', 'istirahat', 'pembulatan', 'batasLembur', 'cutoff']
const timeOk = (t: string) => /^([01]\d|2[0-3])\.[0-5]\d$/.test(t)
const dur = (s: ShiftDef) => `${shiftDuration(s).toLocaleString('id-ID')} jam`

export function ShiftTab({ canEdit, onHistory }: TabProps) {
  const [sh, setSh] = useState<ShiftDef | null>(null)
  const [ru, setRu] = useState<RuleKey | null>(null)
  return (
    <div className="space-y-6">
      <MasterCard title="Shift" description="Jam kerja per shift yang dipakai di Jadwal Shift dan Absensi">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kode</TableHead>
                <TableHead className={head}>Nama</TableHead>
                <TableHead className={head}>Jam</TableHead>
                <TableHead className={`text-right ${head}`}>Durasi</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`text-right ${head}`}>Dipakai oleh</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SHIFT_DEFS.map((s) => {
                const n = usedByShift(s.id)
                return (
                  <TableRow key={s.id} className="h-12 hover:bg-muted/50">
                    <TableCell className="tabular-nums text-muted-foreground">{s.kode}</TableCell>
                    <TableCell className="font-medium">{s.nama}</TableCell>
                    <TableCell>
                      <span className="tabular-nums">{s.mulai} – {s.selesai}</span>
                      {s.lintasHari && <StatusBadge variant="neutral" className="ml-2">Lintas hari</StatusBadge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{dur(s)}</TableCell>
                    <TableCell><AktifBadge status={s.status} /></TableCell>
                    <TableCell className="text-right"><UsedBy n={n} preset={{ extra: { shift: s.id } }} /></TableCell>
                    <TableCell>
                      <RowMenu canEdit={canEdit} used={n} deletable={false} onEdit={() => setSh(s)} onHistory={() => onHistory(`Shift ${s.nama}`)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard title="Pola Kerja" description="Hari kerja dan hari istirahat per department">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Pola</TableHead>
                <TableHead className={head}>Hari kerja</TableHead>
                <TableHead className={head}>Hari istirahat</TableHead>
                <TableHead className={head}>Department</TableHead>
                <TableHead className={`text-right ${head}`}>Dipakai oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {POLA_DEFS.map((p) => (
                <TableRow key={p.id} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell>{p.hariKerja}</TableCell>
                  <TableCell>{p.istirahat}</TableCell>
                  <TableCell className="text-muted-foreground">{p.departments.join(', ')}</TableCell>
                  <TableCell className="text-right"><UsedBy n={usedByPola(p.hari)} preset={{ extra: { pola: p.hari } }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard title="Aturan Kehadiran" description="Parameter yang dipakai Absensi, Jadwal Shift, dan Overtime">
        <dl className="divide-y">
          {RULE_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <div>
                <dt className="text-sm text-muted-foreground">{RULE_LABEL[k]}</dt>
                <dd className="text-sm font-medium tabular-nums">{ruleText(k, rule(k))}</dd>
                {RULES[k].some((v) => v.from > DEMO_TODAY) && (
                  <p className="text-xs text-muted-foreground">
                    Mulai {formatDate(RULES[k].filter((v) => v.from > DEMO_TODAY)[0].from)}: {ruleText(k, RULES[k].filter((v) => v.from > DEMO_TODAY)[0].value as never)}
                  </p>
                )}
                {k === 'cutoff' && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Riwayat periode cut-off">
                    {[...RULES.cutoff].sort((a, b) => b.from.localeCompare(a.from)).map((h) => (
                      <li key={h.from}>
                        <span className="font-medium text-foreground">Berlaku mulai {formatDate(h.from)}</span>: {ruleText('cutoff', h.value)}
                        {h.by ? ` · ${h.by}${h.at ? `, ${formatDate(h.at)}` : ''}` : ''}
                        {h.alasan ? ` · ${h.alasan}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setRu(k)}>
                    <Pencil /> Edit
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onHistory(RULE_LABEL[k])}>Riwayat</Button>
              </div>
            </div>
          ))}
        </dl>
      </MasterCard>

      <SickCategoryCard canEdit={canEdit} />

      {sh && <ShiftSheet def={sh} onClose={() => setSh(null)} />}
      {ru && <RuleSheet k={ru} onClose={() => setRu(null)} />}
    </div>
  )
}

function ShiftSheet({ def, onClose }: { def: ShiftDef; onClose: () => void }) {
  const [nama, setNama] = useState(def.nama)
  const [mulai, setMulai] = useState(def.mulai)
  const [selesai, setSelesai] = useState(def.selesai)
  const [sub, setSub] = useState(false)
  const e: Record<string, string> = {}
  if (!nama.trim()) e.nama = 'Nama wajib diisi'
  if (!timeOk(mulai)) e.mulai = 'Format jam HH.MM, contoh 07.00'
  if (!timeOk(selesai)) e.selesai = 'Format jam HH.MM, contoh 15.00'
  const er = (k: string) => (sub ? e[k] : undefined)
  return (
    <EditSheet
      title={`Edit Shift ${def.nama}`}
      description="Perubahan jam berlaku untuk jadwal yang belum berjalan."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (Object.keys(e).length) return
        const lintas = toMinutes(selesai) <= toMinutes(mulai)
        addAudit({ group: 'Shift & Pola Kerja', entitas: `Shift ${def.nama}`, perubahan: `${def.mulai}–${def.selesai} → ${mulai}–${selesai}`, berlaku: DEMO_TODAY })
        Object.assign(def, { nama: nama.trim(), mulai, selesai, lintasHari: lintas })
        bump()
        toast.success(`Shift ${def.nama} diperbarui`)
        onClose()
      }}
    >
      <Field id="sh-kode" label="Kode" helper="Kode tidak dapat diubah"><Input id="sh-kode" readOnly value={def.kode} className="bg-muted/50 text-foreground" /></Field>
      <Field id="sh-nama" label="Nama" required error={er('nama')}><Input id="sh-nama" value={nama} onChange={(x) => setNama(x.target.value)} aria-invalid={!!er('nama')} /></Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="sh-mulai" label="Jam mulai" required error={er('mulai')} helper="Format HH.MM">
          <Input id="sh-mulai" value={mulai} onChange={(x) => setMulai(x.target.value)} aria-invalid={!!er('mulai')} />
        </Field>
        <Field id="sh-selesai" label="Jam selesai" required error={er('selesai')} helper="Format HH.MM">
          <Input id="sh-selesai" value={selesai} onChange={(x) => setSelesai(x.target.value)} aria-invalid={!!er('selesai')} />
        </Field>
      </div>
    </EditSheet>
  )
}

function RuleSheet({ k, onClose }: { k: RuleKey; onClose: () => void }) {
  const cur = rule(k) as Record<string, number>
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(cur).map(([a, b]) => [a, String(b)])))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const FIELDS: Record<RuleKey, { key: string; label: string; unit: string }[]> = {
    toleransi: [{ key: 'menit', label: 'Toleransi telat', unit: 'menit' }],
    istirahat: [{ key: 'jam', label: 'Istirahat minimal', unit: 'jam' }],
    pembulatan: [{ key: 'menit', label: 'Pembulatan ke bawah per', unit: 'menit' }],
    batasLembur: [{ key: 'hari', label: 'Batas per hari', unit: 'jam' }, { key: 'minggu', label: 'Batas per minggu', unit: 'jam' }],
    cutoff: [{ key: 'dari', label: 'Tanggal mulai', unit: 'tanggal 1–28' }, { key: 'sampai', label: 'Tanggal akhir', unit: 'tanggal 1–28' }],
  }
  const fields = FIELDS[k]
  const e: Record<string, string> = {}
  fields.forEach((f) => {
    const n = Number(v[f.key])
    if (v[f.key] === '' || !Number.isInteger(n) || n < 0) e[f.key] = 'Isi angka bulat 0 atau lebih'
    else if (k === 'cutoff' && (n < 1 || n > 28)) e[f.key] = 'Tanggal harus 1–28'
    else if ((k === 'pembulatan' || k === 'istirahat') && n < 1) e[f.key] = 'Nilai minimal 1'
  })
  if (k === 'batasLembur' && !e.hari && !e.minggu && Number(v.minggu) < Number(v.hari)) e.minggu = 'Batas minggu tidak boleh lebih kecil dari batas hari'
  if (k === 'cutoff' && !e.dari && !e.sampai && Number(v.dari) !== Number(v.sampai) + 1) e.dari = 'Tanggal mulai harus sehari setelah tanggal akhir (mis. 24 s/d 23)'
  if (k === 'cutoff' && alasan.trim().length < 10) e.alasan = 'Alasan minimal 10 karakter'
  if (!berlaku) e.berlaku = 'Berlaku mulai wajib diisi'
  return (
    <EditSheet
      title={`Edit ${RULE_LABEL[k]}`}
      description="Periode absensi yang sudah berjalan tetap memakai nilai lama."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (Object.keys(e).length) return
        const value = Object.fromEntries(fields.map((f) => [f.key, Number(v[f.key])])) as never
        const before = ruleText(k, cur as never)
        const list = RULES[k] as { from: string; value: unknown }[]
        const meta = k === 'cutoff' ? { by: 'Admin HRD', at: DEMO_TODAY, alasan: alasan.trim() } : {}
        const same = list.findIndex((x) => x.from === berlaku)
        if (same >= 0) Object.assign(list[same], { value }, meta)
        else list.push({ from: berlaku, value, ...meta } as never)
        addAudit({ group: 'Shift & Pola Kerja', entitas: RULE_LABEL[k], perubahan: `${before} → ${ruleText(k, value)}`, berlaku })
        bump()
        toast.success(`${RULE_LABEL[k]} diperbarui`)
        onClose()
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} id={`r-${f.key}`} label={f.label} required error={sub ? e[f.key] : undefined} helper={`Satuan: ${f.unit}`}>
            <Input id={`r-${f.key}`} inputMode="numeric" value={v[f.key]} aria-invalid={!!(sub && e[f.key])} onChange={(x) => setV((s) => ({ ...s, [f.key]: x.target.value.replace(/\D/g, '') }))} />
          </Field>
        ))}
      </div>
      <BerlakuField id="r-berlaku" value={berlaku} onChange={setBerlaku} error={sub ? e.berlaku : undefined} />
      {k === 'cutoff' && (
        <>
          <AlasanField id="r-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? e.alasan : undefined} />
          <p className="text-xs text-muted-foreground">Periode yang memuat tanggal berlaku menjadi periode transisi; semua pemilih periode mengikuti aturan baru.</p>
        </>
      )}
    </EditSheet>
  )
}

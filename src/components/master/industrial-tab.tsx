import { Info, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { FinalPayRulesCards } from '@/components/master/final-pay-rules'
import { AktifBadge, BerlakuField, ConfirmDialog, EditSheet, MasterCard, RowMenu, type TabProps } from '@/components/master/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { addExitReason, EXIT_REASONS, exitReasonError, nextExitCode, toggleExitReason } from '@/data/master/exit-reasons'
import { CONTRACT_LIMIT, CONTRACT_LIMIT_SOURCE, contractLimitMonths, monthsText, saveContractLimit } from '@/data/master/contract-limit'
import { SP_VALIDITY, VIOLATIONS, addViolation, deleteViolation, nextViolationCode, saveSpValidity, spValidityMonths, toggleViolation, violationError, type ViolationDef } from '@/data/master/discipline'
import { usedViolation } from '@/data/discipline'
import { OFFS } from '@/data/offboarding'
import { retirementAge, RETIREMENT_AGE, saveRetirementAge } from '@/data/master/retirement'
import { bump, useMaster } from '@/data/master/store'
import { EXITED } from '@/data/profiles'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'

export function IndustrialTab({ canEdit, onHistory }: TabProps) {
  useMaster()
  const [add, setAdd] = useState(false)
  const [age, setAge] = useState(false)
  const [limit, setLimit] = useState(false)
  const [addV, setAddV] = useState(false)
  const [delV, setDelV] = useState<ViolationDef | null>(null)
  const [spv, setSpv] = useState(false)
  const history = [...RETIREMENT_AGE].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai))
  return (
    <div className="space-y-6">
      <MasterCard
        title="Alasan Keluar"
        description="Alasan berakhirnya hubungan kerja; dipakai di Direktori Nonaktif dan perhitungan turnover"
        action={canEdit && <Button onClick={() => setAdd(true)}><Plus /> Tambah Alasan</Button>}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kode</TableHead>
                <TableHead className={head}>Alasan Keluar</TableHead>
                <TableHead className={head}>Dihitung turnover</TableHead>
                <TableHead className={`text-right ${head}`}>Pegawai nonaktif</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EXIT_REASONS.map((r) => {
                const used = EXITED.filter((e) => e.keluar.alasan === r.nama).length + OFFS.filter((o) => o.reason === r.nama && o.status !== 'dibatalkan' && !EXITED.some((e) => e.nik === o.nik)).length
                return (
                  <TableRow key={r.kode} className="h-12 hover:bg-muted/50">
                    <TableCell className="tabular-nums text-muted-foreground">{r.kode}</TableCell>
                    <TableCell className="font-medium">{r.nama}</TableCell>
                    <TableCell><StatusBadge variant={r.turnover ? 'success' : 'neutral'}>{r.turnover ? 'Ya' : 'Tidak'}</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">{used}</TableCell>
                    <TableCell><AktifBadge status={r.status} /></TableCell>
                    <TableCell>
                      <RowMenu
                        canEdit={canEdit}
                        status={r.status}
                        used={used}
                        deletable={false}
                        onToggle={() => {
                          toggleExitReason(r)
                          toast.success(`${r.nama} ${r.status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}`)
                        }}
                        onHistory={() => onHistory(r.nama)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <Alert>
          <Info />
          <AlertDescription>Alasan yang sudah dipakai tidak dihapus, hanya dinonaktifkan. Pindah Kategori bukan alasan keluar dan tidak dihitung turnover.</AlertDescription>
        </Alert>
      </MasterCard>

      <MasterCard
        title="Jenis Pelanggaran"
        description="Kategori pelanggaran untuk Teguran, SP, dan Surat Panggilan di Hubungan Industrial"
        action={canEdit && <Button onClick={() => setAddV(true)}><Plus /> Tambah Pelanggaran</Button>}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kode</TableHead>
                <TableHead className={head}>Jenis Pelanggaran</TableHead>
                <TableHead className={head}>Contoh</TableHead>
                <TableHead className={`text-right ${head}`}>Dipakai</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VIOLATIONS.map((v) => {
                const used = usedViolation(v.kode)
                return (
                  <TableRow key={v.kode} className="h-12 hover:bg-muted/50">
                    <TableCell className="tabular-nums text-muted-foreground">{v.kode}</TableCell>
                    <TableCell className="font-medium">{v.nama}</TableCell>
                    <TableCell className="text-muted-foreground">{v.contoh}</TableCell>
                    <TableCell className="text-right tabular-nums">{used}</TableCell>
                    <TableCell><AktifBadge status={v.status} /></TableCell>
                    <TableCell>
                      <RowMenu canEdit={canEdit} status={v.status} used={used} onToggle={() => { toggleViolation(v); toast.success(`${v.nama} ${v.status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}`) }} onDelete={() => setDelV(v)} onHistory={() => onHistory(v.nama)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard
        title="Masa Berlaku SP"
        description="Lama Teguran Tertulis dan SP1–SP3 berlaku sejak terbit, lalu Kedaluwarsa"
        action={canEdit && <Button variant="outline" onClick={() => setSpv(true)}>Ubah Masa Berlaku</Button>}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{spValidityMonths()}</span>
          <span className="text-sm text-muted-foreground">bulan · berlaku saat ini</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Berlaku mulai</TableHead>
                <TableHead className={`text-right ${head}`}>Masa berlaku</TableHead>
                <TableHead className={head}>Diubah oleh</TableHead>
                <TableHead className={head}>Alasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...SP_VALIDITY].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai)).map((h) => (
                <TableRow key={h.berlakuMulai} className="h-12 hover:bg-muted/50">
                  <TableCell>{formatDate(h.berlakuMulai)}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.value} bulan</TableCell>
                  <TableCell>{h.oleh}</TableCell>
                  <TableCell className="text-muted-foreground">{h.alasan}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard
        title="Usia Pensiun"
        description="Pegawai pensiun pada ulang tahun ke-N. Dipakai filter 'Mendekati pensiun' di Direktori Pegawai."
        action={canEdit && <Button variant="outline" onClick={() => setAge(true)}>Ubah Usia Pensiun</Button>}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{retirementAge()}</span>
          <span className="text-sm text-muted-foreground">tahun · berlaku saat ini</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Berlaku mulai</TableHead>
                <TableHead className={`text-right ${head}`}>Usia pensiun</TableHead>
                <TableHead className={head}>Diubah oleh</TableHead>
                <TableHead className={head}>Alasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.berlakuMulai} className="h-12 hover:bg-muted/50">
                  <TableCell>{formatDate(h.berlakuMulai)}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.value} tahun</TableCell>
                  <TableCell>{h.oleh}</TableCell>
                  <TableCell className="text-muted-foreground">{h.alasan}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard
        title="Batas Total Masa Kontrak"
        description={`Total seluruh kontrak (PKWT) sejak yang pertama. Sumber: ${CONTRACT_LIMIT_SOURCE}. Dipakai validasi Perpanjangan Kontrak di Transaksi Kepegawaian.`}
        action={canEdit && <Button variant="outline" onClick={() => setLimit(true)}>Ubah Batas</Button>}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{contractLimitMonths()}</span>
          <span className="text-sm text-muted-foreground">bulan ({monthsText(contractLimitMonths())}) · berlaku saat ini</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Berlaku mulai</TableHead>
                <TableHead className={`text-right ${head}`}>Batas total</TableHead>
                <TableHead className={head}>Diubah oleh</TableHead>
                <TableHead className={head}>Alasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...CONTRACT_LIMIT].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai)).map((h) => (
                <TableRow key={h.berlakuMulai} className="h-12 hover:bg-muted/50">
                  <TableCell>{formatDate(h.berlakuMulai)}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.value} bulan</TableCell>
                  <TableCell>{h.oleh}</TableCell>
                  <TableCell className="text-muted-foreground">{h.alasan}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <FinalPayRulesCards canEdit={canEdit} />

      {add && <AddReasonSheet onClose={() => setAdd(false)} />}
      {age && <AgeSheet onClose={() => setAge(false)} />}
      {limit && <LimitSheet onClose={() => setLimit(false)} />}
      {addV && <AddViolationSheet onClose={() => setAddV(false)} />}
      {spv && <SpValiditySheet onClose={() => setSpv(false)} />}
      <ConfirmDialog open={delV !== null} onOpenChange={(o) => !o && setDelV(null)} title={`Hapus ${delV?.nama}?`} description="Jenis pelanggaran belum dipakai catatan apa pun, jadi dapat dihapus." confirmLabel="Hapus" destructive onConfirm={() => { if (delV) { deleteViolation(delV); toast.success(`${delV.nama} dihapus`) } setDelV(null) }} />
    </div>
  )
}

function AddReasonSheet({ onClose }: { onClose: () => void }) {
  const [nama, setNama] = useState('')
  const [kode, setKode] = useState(nextExitCode())
  const [turnover, setTurnover] = useState(true)
  const [sub, setSub] = useState(false)
  const err = exitReasonError(nama, kode)
  return (
    <EditSheet
      title="Tambah Alasan Keluar"
      description="Alasan baru langsung tersedia saat menonaktifkan pegawai."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (err.nama || err.kode) return
        addExitReason(nama, kode, turnover)
        toast.success(`Alasan ${nama.trim()} ditambahkan`)
        onClose()
      }}
    >
      <Field id="kr-nama" label="Nama alasan" required error={sub ? err.nama : undefined}>
        <Input id="kr-nama" value={nama} onChange={(e) => setNama(e.target.value)} aria-invalid={sub && !!err.nama} placeholder="Contoh: Pindah Anak Perusahaan" />
      </Field>
      <Field id="kr-kode" label="Kode" required error={sub ? err.kode : undefined}>
        <Input id="kr-kode" value={kode} onChange={(e) => setKode(e.target.value)} aria-invalid={sub && !!err.kode} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={turnover} onCheckedChange={(v) => setTurnover(v === true)} aria-label="Dihitung dalam turnover" />
        Dihitung dalam turnover
      </label>
    </EditSheet>
  )
}

function AgeSheet({ onClose }: { onClose: () => void }) {
  const cur = retirementAge()
  const [val, setVal] = useState(String(cur))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const n = Number(val)
  const ageErr = !val || !Number.isInteger(n) || n < 45 || n > 70 ? 'Usia pensiun 45 – 70 tahun' : undefined
  const alasanErr = alasan.trim().length < 5 ? 'Alasan minimal 5 karakter' : undefined
  return (
    <EditSheet
      title="Ubah Usia Pensiun"
      description="Perubahan berlaku mulai tanggal yang dipilih; riwayat lama tetap tersimpan."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (ageErr || alasanErr || !berlaku) return
        saveRetirementAge(n, berlaku, alasan.trim())
        addAudit({ group: 'Industrial', entitas: 'Usia Pensiun', perubahan: `Usia pensiun: ${cur} → ${n} tahun`, berlaku })
        bump()
        toast.success('Usia pensiun diperbarui')
        onClose()
      }}
    >
      <Field id="up-usia" label="Usia pensiun (tahun)" required error={sub ? ageErr : undefined}>
        <Input id="up-usia" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} aria-invalid={sub && !!ageErr} />
      </Field>
      <BerlakuField id="up-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="up-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
      <p className="text-xs text-muted-foreground">Berlaku sejak {formatDate(berlaku || DEMO_TODAY)}.</p>
    </EditSheet>
  )
}

function LimitSheet({ onClose }: { onClose: () => void }) {
  const cur = contractLimitMonths()
  const [val, setVal] = useState(String(cur))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const n = Number(val)
  const err = !val || !Number.isInteger(n) || n < 12 || n > 120 ? 'Batas 12 – 120 bulan' : undefined
  const alasanErr = alasan.trim().length < 5 ? 'Alasan minimal 5 karakter' : undefined
  return (
    <EditSheet
      title="Ubah Batas Total Masa Kontrak"
      description="Perubahan berlaku mulai tanggal yang dipilih; riwayat lama tetap tersimpan."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (err || alasanErr || !berlaku) return
        saveContractLimit(n, berlaku, alasan.trim())
        addAudit({ group: 'Industrial', entitas: 'Batas total masa kontrak', perubahan: `Batas total masa kontrak: ${cur} → ${n} bulan`, berlaku })
        bump()
        toast.success('Batas total masa kontrak diperbarui')
        onClose()
      }}
    >
      <Field id="bk-bulan" label="Batas total (bulan)" required error={sub ? err : undefined} helper={`Sumber: ${CONTRACT_LIMIT_SOURCE}. 60 bulan = 5 tahun.`}>
        <Input id="bk-bulan" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} aria-invalid={sub && !!err} />
      </Field>
      <BerlakuField id="bk-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="bk-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
    </EditSheet>
  )
}

function AddViolationSheet({ onClose }: { onClose: () => void }) {
  const [nama, setNama] = useState('')
  const [kode, setKode] = useState(nextViolationCode())
  const [contoh, setContoh] = useState('')
  const [sub, setSub] = useState(false)
  const err = violationError(nama, kode)
  return (
    <EditSheet
      title="Tambah Jenis Pelanggaran"
      description="Jenis baru langsung tersedia saat membuat catatan disiplin."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (err.nama || err.kode) return
        addViolation(nama, kode, contoh)
        toast.success(`Pelanggaran ${nama.trim()} ditambahkan`)
        onClose()
      }}
    >
      <Field id="plg-nama" label="Nama pelanggaran" required error={sub ? err.nama : undefined}><Input id="plg-nama" value={nama} onChange={(e) => setNama(e.target.value)} aria-invalid={sub && !!err.nama} placeholder="Contoh: Membawa barang terlarang" /></Field>
      <Field id="plg-kode" label="Kode" required error={sub ? err.kode : undefined}><Input id="plg-kode" value={kode} onChange={(e) => setKode(e.target.value)} aria-invalid={sub && !!err.kode} /></Field>
      <Field id="plg-contoh" label="Contoh"><Input id="plg-contoh" value={contoh} onChange={(e) => setContoh(e.target.value)} /></Field>
    </EditSheet>
  )
}

function SpValiditySheet({ onClose }: { onClose: () => void }) {
  const cur = spValidityMonths()
  const [val, setVal] = useState(String(cur))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const n = Number(val)
  const err = !val || !Number.isInteger(n) || n < 1 || n > 24 ? 'Masa berlaku 1 – 24 bulan' : undefined
  const alasanErr = alasan.trim().length < 5 ? 'Alasan minimal 5 karakter' : undefined
  return (
    <EditSheet
      title="Ubah Masa Berlaku SP"
      description="SP yang sudah terbit tetap memakai masa berlaku saat terbit; perubahan berlaku untuk SP berikutnya."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (err || alasanErr || !berlaku) return
        saveSpValidity(n, berlaku, alasan.trim())
        addAudit({ group: 'Industrial', entitas: 'Masa berlaku SP', perubahan: `Masa berlaku SP: ${cur} → ${n} bulan`, berlaku })
        bump()
        toast.success('Masa berlaku SP diperbarui')
        onClose()
      }}
    >
      <Field id="spv-bulan" label="Masa berlaku (bulan)" required error={sub ? err : undefined}><Input id="spv-bulan" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} aria-invalid={sub && !!err} /></Field>
      <BerlakuField id="spv-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="spv-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
    </EditSheet>
  )
}

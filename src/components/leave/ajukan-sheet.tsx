import { useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '@/lib/today'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { JENIS_ICON } from '@/components/leave/status'
import type { NewRequest } from '@/components/leave/use-leave'
import { Button } from '@/components/ui/button'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TimeInput } from '@/components/attendance/time-input'
import { SHIFTS, toMin, validTime } from '@/data/attendance'
import { contractEndError, ROSTER, type RosterEmployee } from '@/data/employees'
import {
  balanceOf,
  eligibleFrom,
  endAfterWorkdays,
  firstOpenDate,
  isEligible,
  isJamKerja,
  isPeriodClosed,
  isWorkday,
  JAM_KERJA,
  jamKerjaMinDate,
  KHUSUS,
  periodOf,
  quotaError,
  quotaText,
  rangeLabel,
  teamLabel,
  workdaysBetween,
  type Jenis,
  type LeaveRequest,
} from '@/data/leave'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { cn } from '@/lib/utils'
import { AlasanField } from '@/components/ui/alasan-field'

const HELPER: Record<Jenis, string> = {
  'Cuti Tahunan': 'Memotong saldo cuti',
  'Cuti Khusus': 'Tanpa potong saldo',
  Izin: 'Sehari penuh · memotong gaji',
  'Izin Terlambat': 'Datang terlambat · tanpa potong gaji',
  'Izin Pulang Cepat': 'Pulang lebih awal · tanpa potong gaji',
  Sakit: 'Wajib surat dokter',
  Dinas: 'Wajib surat tugas · dihitung hadir',
}
const MAIN: Jenis[] = ['Cuti Tahunan', 'Cuti Khusus', 'Izin', 'Sakit', 'Dinas']

type Errors = Partial<Record<'nik' | 'jenis' | 'sub' | 'start' | 'jam' | 'tujuan' | 'alasan' | 'file', string>>

export function AjukanSheet({
  open,
  onOpenChange,
  requests,
  octClosed,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  requests: LeaveRequest[]
  octClosed: boolean
  onSubmit: (input: NewRequest) => void
}) {
  const [nik, setNik] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const [q, setQ] = useState('')
  const [jenis, setJenis] = useState<Jenis | ''>('')
  const [sub, setSub] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [tujuan, setTujuan] = useState('')
  const [jam, setJam] = useState('')
  const [alasan, setAlasan] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setNik(''); setJenis(''); setSub(''); setStart(''); setEnd(''); setTujuan(''); setJam(''); setAlasan(''); setFile(null)
      setQ(''); setSaved(false)
    }
  }, [open])

  const emp: RosterEmployee | undefined = ROSTER.find((e) => e.nik === nik)
  const eligible = emp ? isEligible(emp) : true
  const khusus = KHUSUS.find((k) => k.id === sub)
  const bal = emp ? balanceOf(emp, requests) : null

  useEffect(() => {
    if (emp && !eligible && jenis === 'Cuti Tahunan') setJenis('')
  }, [emp, eligible, jenis])

  const jamKerja = jenis !== '' && isJamKerja(jenis)
  const endDate = jamKerja ? start : jenis === 'Cuti Khusus' ? (khusus && start && emp ? endAfterWorkdays(start, khusus.hari, emp) : '') : end
  const hari = jamKerja ? 0 : emp && start && endDate && endDate >= start ? workdaysBetween(start, endDate, emp) : 0
  const kuotaErr = jamKerja && emp ? quotaError(emp.nik, start || DEMO_TODAY, requests) : ''

  const dateError = useMemo(() => {
    if (!emp || !jenis || !start) return ''
    if (endDate && endDate < start) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
    const p = periodOf(start)
    if (isPeriodClosed(p, octClosed))
      return `Periode ${p.label} sudah closing. Pilih tanggal mulai ${formatDate(firstOpenDate(octClosed))} atau setelahnya.`
    if (jamKerja) {
      const min = jamKerjaMinDate(emp)
      if (start < min) return `Hanya hari ini atau setelahnya, atau mundur sampai ${formatDate(min)} (1 hari kerja).`
      if (!isWorkday(start, emp)) return 'Tanggal bukan hari kerja.'
    } else if (jenis !== 'Sakit' && start < DEMO_TODAY) return 'Tanggal mulai tidak boleh sebelum hari ini. Hanya Sakit yang boleh diajukan mundur.'
    const ended = contractEndError(emp, endDate || start)
    if (ended) return ended
    if (!endDate) return ''
    if (!jamKerja && hari === 0) return 'Rentang tanggal tidak mengandung hari kerja.'
    // Izin jam kerja boleh berdampingan dengan izin jam kerja lain; hanya jenis yang sama di hari yang sama yang bentrok.
    const clash = requests.find(
      (r) => r.nik === emp.nik && r.status !== 'dibatalkan' && r.status !== 'ditolak' && r.start <= endDate && r.end >= start && (!(jamKerja || isJamKerja(r.jenis)) || r.jenis === jenis),
    )
    if (clash) return `Bentrok dengan ${clash.no} (${clash.jenis}, ${rangeLabel(clash.start, clash.end)}).`
    if (jenis === 'Cuti Tahunan' && bal && hari > bal.sisa) return `Saldo tidak cukup. Sisa ${bal.sisa} hari, diajukan ${hari} hari.`
    return ''
  }, [emp, jenis, start, endDate, hari, octClosed, requests, bal, jamKerja])

  const list = ROSTER.filter((e) => `${e.nama} ${e.nik}`.toLowerCase().includes(q.trim().toLowerCase()))

  const validate = (): Errors => {
    const e: Errors = {}
    if (!nik) e.nik = 'Pilih pegawai'
    if (!jenis) e.jenis = 'Pilih jenis pengajuan'
    if (jenis === 'Cuti Khusus' && !sub) e.sub = 'Pilih jenis cuti khusus'
    if (!start) e.start = 'Tanggal mulai wajib diisi'
    else if (jenis !== 'Cuti Khusus' && !jamKerja && !end) e.start = 'Tanggal selesai wajib diisi'
    if (jamKerja) {
      const sh = emp ? SHIFTS[emp.shift] : null
      if (!jam) e.jam = jenis === 'Izin Terlambat' ? 'Perkiraan jam datang wajib diisi' : 'Jam pulang wajib diisi'
      else if (!validTime(jam)) e.jam = 'Jam tidak valid. Gunakan format 24 jam HH.MM, contoh 07.30'
      else if (sh && emp?.shift !== 'malam') {
        const m = toMin(jam)
        if (jenis === 'Izin Terlambat' && m <= sh.start) e.jam = `Jam datang harus setelah shift mulai (${String(Math.floor(sh.start / 60)).padStart(2, '0')}.${String(sh.start % 60).padStart(2, '0')}).`
        if (jenis === 'Izin Pulang Cepat' && m >= sh.end) e.jam = `Jam pulang harus sebelum shift berakhir (${String(Math.floor(sh.end / 60) % 24).padStart(2, '0')}.${String(sh.end % 60).padStart(2, '0')}).`
      }
    }
    if (jenis === 'Dinas' && !tujuan.trim()) e.tujuan = 'Tujuan dinas wajib diisi'
    if (!validAlasan(alasan)) e.alasan = ALASAN_ERROR
    if (jenis === 'Sakit' && !file) e.file = 'Surat dokter wajib dilampirkan'
    if (jenis === 'Dinas' && !file) e.file = 'Surat tugas wajib dilampirkan'
    return e
  }
  const errors = saved ? validate() : {}
  const dateErr = dateError || kuotaErr || errors.start

  const submit = () => {
    setSaved(true)
    if (Object.keys(validate()).length || dateError || kuotaErr || !jenis) return
    onSubmit({
      nik,
      jenis,
      sub: jenis === 'Cuti Khusus' ? khusus?.label : undefined,
      start,
      end: endDate,
      hari,
      alasan: alasan.trim(),
      tujuan: jenis === 'Dinas' ? tujuan.trim() : undefined,
      lampiran: file?.name,
      jam: jamKerja ? jam : undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Ajukan Cuti, Izin, Sakit &amp; Dinas</SheetTitle>
          <SheetDescription>Pengajuan atas nama pegawai. Saldo cuti tahunan langsung dipesan setelah diajukan.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="cuti-pegawai" label="Pegawai" required error={errors.nik}>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="cuti-pegawai"
                  type="button"
                  role="combobox"
                  aria-expanded={comboOpen}
                  aria-invalid={errors.nik ? true : undefined}
                  variant="outline"
                  className={cn('w-full justify-between font-normal', !emp && 'text-muted-foreground')}
                >
                  {emp ? `${emp.nama} · ${emp.nik}` : 'Cari nama atau NIP…'}
                  <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="relative border-b">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    aria-label="Cari pegawai"
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari nama atau NIP…"
                    className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0"
                  />
                </div>
                <ul role="listbox" aria-label="Daftar pegawai" className="max-h-56 overflow-y-auto p-1">
                  {list.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">Pegawai tidak ditemukan.</li>}
                  {list.map((e) => (
                    <li key={e.nik} role="option" aria-selected={e.nik === nik}>
                      <button
                        type="button"
                        onClick={() => {
                          setNik(e.nik)
                          setComboOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <Check className={cn('size-4 shrink-0', e.nik === nik ? 'opacity-100' : 'opacity-0')} aria-hidden />
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium">{e.nama}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{e.nik} · {teamLabel(e)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
            {emp && (
              <div className="space-y-0.5 text-xs text-muted-foreground tabular-nums">
                <p>{teamLabel(emp)} · Shift {SHIFTS[emp.shift].label}</p>
                {bal && <p className="text-foreground">Sisa cuti tahunan {bal.sisa} hari</p>}
              </div>
            )}
          </Field>

          <fieldset className="space-y-2" aria-describedby={descId('cuti-jenis', !!emp && !eligible, !!errors.jenis)}>
            <legend className="text-sm font-medium">
              Jenis Pengajuan <span aria-hidden className="text-danger">*</span>
              <span className="sr-only"> (wajib)</span>
            </legend>
            {[{ label: null, list: MAIN }, { label: 'Izin Jam Kerja', list: JAM_KERJA }].map((g) => (
              <div key={g.label ?? 'main'} className="space-y-2">
                {g.label && <p className="pt-1 text-xs font-medium text-muted-foreground">{g.label}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {g.list.map((j, i) => {
                    const Icon = JENIS_ICON[j]
                    const disabled = j === 'Cuti Tahunan' && !!emp && !eligible
                    return (
                      <label
                        key={j}
                        className={cn(
                          'flex h-full cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                          !g.label && i === 4 && 'col-span-2',
                          disabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="radio"
                          name="cuti-jenis"
                          className="sr-only"
                          value={j}
                          checked={jenis === j}
                          disabled={disabled}
                          onChange={() => {
                            setJenis(j)
                            setSub('')
                            setEnd('')
                            setJam('')
                            setFile(null)
                          }}
                        />
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium">{j}</span>
                          <span className="text-xs text-muted-foreground">{HELPER[j]}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            {emp && !eligible && (
              <p id="cuti-jenis-help" className="text-xs text-muted-foreground">
                Belum berhak cuti tahunan. Berhak mulai {formatDate(eligibleFrom(emp))} (12 bulan masa kerja).
              </p>
            )}
            {errors.jenis && <p id="cuti-jenis-err" className="text-sm text-danger">{errors.jenis}</p>}
          </fieldset>

          {jenis === 'Cuti Khusus' && (
            <Field id="cuti-sub" label="Jenis Cuti Khusus" required error={errors.sub} helper={khusus ? `Jatah ${khusus.hari} hari kerja` : undefined}>
              <Select value={sub} onValueChange={setSub}>
                <SelectTrigger id="cuti-sub" className="w-full" aria-invalid={errors.sub ? true : undefined}>
                  <SelectValue placeholder="Pilih jenis cuti khusus" />
                </SelectTrigger>
                <SelectContent>
                  {KHUSUS.map((k) => <SelectItem key={k.id} value={k.id}>{k.label} ({k.hari} hari)</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {jenis === 'Dinas' && (
            <Field id="cuti-tujuan" label="Tujuan Dinas" required error={errors.tujuan}>
              <Input
                id="cuti-tujuan"
                value={tujuan}
                placeholder="Contoh: Vendor mold, Cikarang"
                aria-invalid={errors.tujuan ? true : undefined}
                aria-describedby={descId('cuti-tujuan', false, !!errors.tujuan)}
                onChange={(e) => setTujuan(e.target.value)}
              />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="cuti-mulai" label="Tanggal Mulai" required>
              <DatePicker
                id="cuti-mulai"
                value={start}
                invalid={!!dateErr}
                hintDate={DEMO_TODAY}
                aria-describedby="cuti-tanggal-info"
                onChange={(v) => {
                  setStart(v)
                  if (end && end < v) setEnd('')
                }}
              />
            </Field>
            {jamKerja ? (
              <Field id="cuti-jam" label={jenis === 'Izin Terlambat' ? 'Perkiraan Jam Datang' : 'Jam Pulang'} required error={errors.jam} helper={emp ? `Jam shift ${SHIFTS[emp.shift].range}` : 'Format 24 jam HH.MM'}>
                <TimeInput id="cuti-jam" value={jam} onChange={setJam} invalid={!!errors.jam} aria-describedby={descId('cuti-jam', true, !!errors.jam)} />
              </Field>
            ) : (
            <Field id="cuti-selesai" label="Tanggal Selesai" required>
              {jenis === 'Cuti Khusus' ? (
                <Input id="cuti-selesai" readOnly value={endDate ? formatDate(endDate) : ''} placeholder="Otomatis dari jatah" className="bg-muted/50" aria-describedby="cuti-tanggal-info" />
              ) : (
                <DatePicker id="cuti-selesai" value={end} invalid={!!dateErr} hintDate={start || DEMO_TODAY} min={start || undefined} aria-describedby="cuti-tanggal-info" onChange={setEnd} />
              )}
            </Field>
            )}
          </div>
          <div id="cuti-tanggal-info" className="-mt-2 space-y-1 text-sm">
            {hari > 0 && !dateError && (
              <p className="tabular-nums">
                <span className="font-medium">{hari} hari kerja</span>
                <span className="text-muted-foreground"> ({rangeLabel(start, endDate)})</span>
              </p>
            )}
            {jamKerja && emp && !dateError && !kuotaErr && start && <p className="text-muted-foreground tabular-nums">Tidak memotong gaji dan tidak memakai saldo cuti.</p>}
            {jamKerja && emp && <p className="font-medium tabular-nums">{quotaText(emp.nik, start || DEMO_TODAY, requests)}</p>}
            {hari > 0 && !dateError && jenis === 'Cuti Tahunan' && bal && (
              <p className="text-muted-foreground tabular-nums">Sisa setelah pengajuan: {bal.sisa - hari} hari</p>
            )}
            {dateErr && <p className="text-danger">{dateErr}</p>}
          </div>

          <AlasanField id="cuti-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={errors.alasan} />

          <Field
            id="cuti-file"
            label={jenis === 'Dinas' ? 'Surat tugas' : jenis === 'Sakit' ? 'Surat dokter' : 'Lampiran'}
            required={jenis === 'Sakit' || jenis === 'Dinas'}
            error={errors.file}
            helper={jenis === 'Sakit' ? 'Surat dokter, foto atau PDF, maks. 5 MB' : jenis === 'Dinas' ? 'Surat tugas, foto atau PDF, maks. 5 MB' : 'Opsional. Foto atau PDF, maks. 5 MB'}
          >
            <FilePicker
              id="cuti-file"
              accept="image/jpeg,image/png,application/pdf"
              extensions={['jpg', 'jpeg', 'png', 'pdf']}
              maxBytes={5 * 1048576}
              typeError="Format file harus JPG, PNG, atau PDF"
              value={file}
              onChange={setFile}
              describedBy={descId('cuti-file', true, !!errors.file)}
            />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

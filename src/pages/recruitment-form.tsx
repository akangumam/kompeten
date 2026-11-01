import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { FormatInput } from '@/components/employee/format-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { ageOn, DOC_DEFS, type CandEdu, type DocKey, type Pengalaman } from '@/data/candidates'
import { sumberLamaran } from '@/data/master/recruitment'
import { checkNik, submitApplication } from '@/data/recruitment/flow'
import { jobOf, openJobs, rankOf } from '@/data/recruitment/jobs'
import { useRecruitment } from '@/data/recruitment/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { formatError, formatHp } from '@/lib/validators'
import { cn } from '@/lib/utils'

type Form = {
  lowongan: string
  sumber: string
  nama: string
  ktp: string
  tempatLahir: string
  tanggalLahir: string
  gender: string
  pernikahan: string
  tanggungan: string
  alamatKtp: string
  samaKtp: boolean
  alamatDomisili: string
  hp: string
  email: string
  daruratNama: string
  daruratHubungan: string
  daruratHp: string
  pendidikan: CandEdu[]
  pengalaman: Pengalaman[]
  belumBekerja: boolean
  skills: string[]
  sertifikat: PickedFile[]
  docs: Partial<Record<DocKey, PickedFile>>
  setuju: boolean
}
const BLANK_EDU: CandEdu = { jenjang: '', institusi: '', jurusan: '', tahun: '', nilai: '' }
const BLANK_EXP: Pengalaman = { perusahaan: '', posisi: '', mulai: '', selesai: '', alasan: '' }
const blank = (): Form => ({
  lowongan: '', sumber: '', nama: '', ktp: '', tempatLahir: '', tanggalLahir: '', gender: '', pernikahan: '', tanggungan: '0', alamatKtp: '', samaKtp: false, alamatDomisili: '',
  hp: '', email: '', daruratNama: '', daruratHubungan: '', daruratHp: '', pendidikan: [{ ...BLANK_EDU }], pengalaman: [{ ...BLANK_EXP }], belumBekerja: false, skills: [], sertifikat: [], docs: {}, setuju: false,
})
/** Draft yang disimpan lewat "Simpan Draft" (dibaca ulang saat halaman dibuka lagi). */
let SAVED: Form | null = null

const STEPS = [
  ['lamaran', 'Lamaran'], ['pribadi', 'Data pribadi'], ['alamat', 'Alamat & kontak'], ['pendidikan', 'Pendidikan'],
  ['pengalaman', 'Pengalaman kerja'], ['skill', 'Keterampilan & sertifikat'], ['dokumen', 'Dokumen'], ['pernyataan', 'Pernyataan'],
] as const
const JENJANG = ['SD', 'SMP', 'SMA', 'SMK', 'D3', 'S1', 'S2']
const DOC_ACCEPT = { accept: '.pdf,.jpg,.jpeg,.png', extensions: ['pdf', 'jpg', 'jpeg', 'png'], maxBytes: 5 * 1048576, typeError: 'Format file harus PDF, JPG, atau PNG' }
const PHOTO_ACCEPT = { accept: '.jpg,.jpeg,.png', extensions: ['jpg', 'jpeg', 'png'], maxBytes: 5 * 1048576, typeError: 'Format foto harus JPG atau PNG' }

function SectionCard({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card id={`dicap-${id}`} className="scroll-mt-6">
      <CardHeader><CardTitle>{title}</CardTitle>{description && <p className="text-sm text-muted-foreground">{description}</p>}</CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export default function RecruitmentFormPage({ user, onDirtyChange, onDone }: { user: CurrentUser; onDirtyChange: (d: boolean) => void; onDone: (id: string) => void }) {
  useRecruitment()
  const [f, setF] = useState<Form>(() => SAVED ?? blank())
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [sub, setSub] = useState(false)
  const [active, setActive] = useState<string>('lamaran')
  const [skillInput, setSkillInput] = useState('')
  const dirty = useRef(false)
  const patch = (p: Partial<Form>) => { dirty.current = true; onDirtyChange(true); setF((x) => ({ ...x, ...p })) }
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }))
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  // Scroll-spy untuk daftar langkah di kiri.
  useEffect(() => {
    const els = STEPS.map(([id]) => document.getElementById(`dicap-${id}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActive(vis.target.id.replace('dicap-', ''))
    }, { rootMargin: '-10% 0px -75% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const job = jobOf(f.lowongan)
  const jobs = openJobs()
  const sources = job ? job.sumber.filter((s) => sumberLamaran().includes(s)) : sumberLamaran()
  const age = f.tanggalLahir ? ageOn(f.tanggalLahir, DEMO_TODAY) : null
  const checks = useMemo(() => checkNik(f.ktp), [f.ktp])
  const aktif = checks.find((c) => c.kind === 'aktif')
  const mantan = checks.find((c) => c.kind === 'mantan')
  const pernah = checks.filter((c) => c.kind === 'pernah')
  const topRank = Math.max(0, ...f.pendidikan.filter((p) => p.jenjang).map((p) => rankOf(p.jenjang)))
  const eduWarn = job && topRank > 0 && topRank < rankOf(job.syarat.pendidikan) ? `Pendidikan tertinggi di bawah syarat minimal lowongan (${job.syarat.pendidikan}).` : ''
  const ageWarn = job && age !== null && age > job.syarat.usiaMax ? `Usia ${age} tahun melebihi batas lowongan (${job.syarat.usiaMax} tahun).` : ''

  const calc = (sub: boolean) => {
  const fmt = {
    ktp: touched.ktp || sub ? formatError('ktp', f.ktp) : '',
    hp: touched.hp || sub ? formatError('hp', f.hp) : '',
    email: touched.email || sub ? formatError('email', f.email) : '',
    daruratHp: touched.daruratHp || sub ? formatError('hp', f.daruratHp) : '',
  }
  const req = (v: string, msg: string) => (sub && !v.trim() ? msg : undefined)
  return {
    lowongan: req(f.lowongan, 'Lowongan wajib dipilih'),
    sumber: req(f.sumber, 'Sumber wajib dipilih'),
    nama: req(f.nama, 'Nama lengkap wajib diisi'),
    ktp: fmt.ktp || (sub && !f.ktp ? 'NIK (KTP) wajib diisi' : ''),
    tempatLahir: req(f.tempatLahir, 'Tempat lahir wajib diisi'),
    tanggalLahir: req(f.tanggalLahir, 'Tanggal lahir wajib diisi'),
    gender: req(f.gender, 'Jenis kelamin wajib dipilih'),
    pernikahan: req(f.pernikahan, 'Status perkawinan wajib dipilih'),
    alamatKtp: req(f.alamatKtp, 'Alamat sesuai KTP wajib diisi'),
    alamatDomisili: f.samaKtp ? undefined : req(f.alamatDomisili, 'Alamat domisili wajib diisi'),
    hp: fmt.hp || (sub && !f.hp ? 'Nomor HP wajib diisi' : ''),
    email: fmt.email || (sub && !f.email ? 'Email wajib diisi' : ''),
    daruratNama: req(f.daruratNama, 'Nama kontak darurat wajib diisi'),
    daruratHubungan: req(f.daruratHubungan, 'Hubungan wajib diisi'),
    daruratHp: fmt.daruratHp || (sub && !f.daruratHp ? 'Nomor HP kontak darurat wajib diisi' : ''),
    pendidikan: sub && !f.pendidikan.some((p) => p.jenjang && p.institusi.trim()) ? 'Isi minimal satu riwayat pendidikan lengkap (jenjang dan institusi)' : undefined,
    pengalaman: sub && !f.belumBekerja && !f.pengalaman.some((p) => p.perusahaan.trim()) ? 'Isi pengalaman kerja atau centang "Belum pernah bekerja"' : undefined,
    setuju: sub && !f.setuju ? 'Pernyataan harus disetujui untuk mengirim lamaran' : undefined,
  }
  }
  const errors = calc(sub)
  const allErrors = calc(true)
  const missingDocs = DOC_DEFS.filter((d) => d.wajib && !f.docs[d.key])
  const anyError = Object.values(allErrors).some(Boolean) || missingDocs.length > 0 || !!aktif

  const kirim = () => {
    setSub(true)
    if (anyError) {
      const el = document.querySelector('[aria-invalid="true"], [role="alert"]') as HTMLElement | null
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      toast.error('Lengkapi isian yang ditandai sebelum mengirim')
      return
    }
    const c = submitApplication({
      lowonganId: f.lowongan, sumber: f.sumber, nama: f.nama, ktp: f.ktp, tempatLahir: f.tempatLahir, tanggalLahir: f.tanggalLahir, gender: f.gender, pernikahan: f.pernikahan, tanggungan: Number(f.tanggungan || 0),
      alamatKtp: f.alamatKtp.trim(), alamatDomisili: (f.samaKtp ? f.alamatKtp : f.alamatDomisili).trim(), phone: formatHp(f.hp), email: f.email.trim(),
      darurat: { nama: f.daruratNama.trim(), hubungan: f.daruratHubungan.trim(), hp: f.daruratHp },
      pendidikan: f.pendidikan.filter((p) => p.jenjang && p.institusi.trim()), pengalaman: f.belumBekerja ? [] : f.pengalaman.filter((p) => p.perusahaan.trim()), belumBekerja: f.belumBekerja, skills: f.skills,
      docs: (Object.entries(f.docs) as [DocKey, PickedFile][]).map(([key, v]) => ({ key, file: v.name, size: v.size })),
    }, user.nama)
    if (!c) return
    SAVED = null
    dirty.current = false
    onDirtyChange(false)
    toast.success(`Lamaran terkirim: ${c.id}`, { description: `${c.nama} masuk tahap Seleksi Administrasi.` })
    onDone(c.id)
  }
  const simpan = () => { SAVED = f; dirty.current = false; onDirtyChange(false); toast.success('Draft formulir disimpan') }

  const setEdu = (i: number, p: Partial<CandEdu>) => patch({ pendidikan: f.pendidikan.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setExp = (i: number, p: Partial<Pengalaman>) => patch({ pengalaman: f.pengalaman.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const addSkill = () => {
    const v = skillInput.trim()
    if (v && !f.skills.includes(v)) patch({ skills: [...f.skills, v] })
    setSkillInput('')
  }
  const docPicker = (key: DocKey, id: string, photo = false) => (
    <FilePicker id={id} {...(photo || key === 'foto' ? PHOTO_ACCEPT : DOC_ACCEPT)} value={f.docs[key] ?? null} onChange={(v) => patch({ docs: { ...f.docs, [key]: v ?? undefined } })} />
  )
  const nikAlerts = f.ktp.length === 16 && (aktif || mantan || pernah.length > 0)
  const goto = (id: string) => document.getElementById(`dicap-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Form Calon Pegawai (DICAP)</h1>
        <p className="text-sm text-muted-foreground">Input lamaran oleh HR Recruitment. Nomor lamaran dibuat otomatis saat dikirim.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Langkah formulir" className="hidden lg:block">
          <ol className="sticky top-6 space-y-1">
            {STEPS.map(([id, label], i) => (
              <li key={id}>
                <button type="button" aria-current={active === id ? 'step' : undefined} onClick={() => goto(id)}
                  className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50', active === id ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground')}>
                  <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums', active === id && 'border-ring')}>{i + 1}</span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-6">
          <SectionCard id="lamaran" title="1. Lamaran">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field id="dc-lowongan" label="Lowongan" required error={errors.lowongan} helper="Hanya lowongan yang sedang Dibuka">
                <Select value={f.lowongan} onValueChange={(v) => patch({ lowongan: v, sumber: '' })}>
                  <SelectTrigger id="dc-lowongan" className="w-full" aria-invalid={!!errors.lowongan || undefined}><SelectValue placeholder="Pilih lowongan" /></SelectTrigger>
                  <SelectContent>{jobs.map((j) => <SelectItem key={j.no} value={j.no}>{j.no} · {j.posisi}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field id="dc-sumber" label="Sumber lamaran" required error={errors.sumber}>
                <Select value={f.sumber} onValueChange={(v) => patch({ sumber: v })} disabled={!f.lowongan}>
                  <SelectTrigger id="dc-sumber" className="w-full" aria-invalid={!!errors.sumber || undefined}><SelectValue placeholder={f.lowongan ? 'Pilih sumber' : 'Pilih lowongan dahulu'} /></SelectTrigger>
                  <SelectContent>{sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {job && <p className="text-sm text-muted-foreground">{job.dept} · pendidikan minimal {job.syarat.pendidikan} · usia maksimal {job.syarat.usiaMax} tahun · {job.syarat.pengalaman || 'tanpa syarat pengalaman'}</p>}
          </SectionCard>

          <SectionCard id="pribadi" title="2. Data pribadi">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field id="dc-nama" label="Nama lengkap" required error={errors.nama} className="md:col-span-2">
                <Input id="dc-nama" value={f.nama} aria-invalid={!!errors.nama || undefined} onChange={(e) => patch({ nama: e.target.value })} />
              </Field>
              <div className="md:col-span-2 space-y-3">
                <FormatInput id="dc-ktp" label="NIK (KTP)" rule="ktp" required value={f.ktp} error={errors.ktp || undefined} onChange={(v) => patch({ ktp: v })} onBlur={() => blur('ktp')} />
                {nikAlerts && (
                  <div className="space-y-2" aria-label="Pemeriksaan NIK (KTP)">
                    {aktif?.kind === 'aktif' && <Alert variant="warning"><AlertTitle>Tidak dapat dikirim</AlertTitle><AlertDescription>NIK terdaftar sebagai pegawai aktif {aktif.nip}.</AlertDescription></Alert>}
                    {mantan?.kind === 'mantan' && (
                      <Alert variant={mantan.rehire === 'Tidak' ? 'warning' : 'info'}>
                        <AlertDescription>Mantan pegawai {mantan.nip}, keluar {formatDate(mantan.keluar)} ({mantan.alasan}) · Eligible for Rehire: {mantan.rehire ?? '—'}</AlertDescription>
                      </Alert>
                    )}
                    {pernah.map((p) => p.kind === 'pernah' && <Alert key={p.nomor} variant="warning"><AlertDescription>NIK ini sudah melamar dalam 6 bulan terakhir: {p.nomor} ({formatDate(p.tanggal)}, {p.nama}).</AlertDescription></Alert>)}
                  </div>
                )}
              </div>
              <Field id="dc-tempat" label="Tempat lahir" required error={errors.tempatLahir}><Input id="dc-tempat" value={f.tempatLahir} aria-invalid={!!errors.tempatLahir || undefined} onChange={(e) => patch({ tempatLahir: e.target.value })} /></Field>
              <Field id="dc-lahir" label="Tanggal lahir" required error={errors.tanggalLahir} warning={ageWarn || undefined} helper={age !== null ? `Usia ${age} tahun` : undefined}>
                <DatePicker id="dc-lahir" hintDate="1995-06-15" value={f.tanggalLahir} onChange={(v) => patch({ tanggalLahir: v })} invalid={!!errors.tanggalLahir} max={DEMO_TODAY} />
              </Field>
              <Field id="dc-gender" label="Jenis kelamin" required error={errors.gender}>
                <Select value={f.gender} onValueChange={(v) => patch({ gender: v })}>
                  <SelectTrigger id="dc-gender" className="w-full" aria-invalid={!!errors.gender || undefined}><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{['Laki-laki', 'Perempuan'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-[1fr_120px] gap-4">
                <Field id="dc-nikah" label="Status perkawinan" required error={errors.pernikahan}>
                  <Select value={f.pernikahan} onValueChange={(v) => patch({ pernikahan: v, tanggungan: v === 'Belum Menikah' ? '0' : f.tanggungan })}>
                    <SelectTrigger id="dc-nikah" className="w-full" aria-invalid={!!errors.pernikahan || undefined}><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>{['Belum Menikah', 'Menikah', 'Cerai'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field id="dc-tang" label="Tanggungan" helper="Untuk PTKP">
                  <Input id="dc-tang" inputMode="numeric" value={f.tanggungan} onChange={(e) => patch({ tanggungan: e.target.value.replace(/\D/g, '').slice(0, 1) })} />
                </Field>
              </div>
              <Field id="dc-foto" label="Pas foto" required helper="JPG atau PNG, maksimal 5 MB" error={sub && !f.docs.foto ? 'Pas foto wajib diunggah' : undefined}>{docPicker('foto', 'dc-foto', true)}</Field>
            </div>
          </SectionCard>

          <SectionCard id="alamat" title="3. Alamat & kontak">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field id="dc-ktpalamat" label="Alamat sesuai KTP" required error={errors.alamatKtp} className="md:col-span-2"><Textarea id="dc-ktpalamat" value={f.alamatKtp} aria-invalid={!!errors.alamatKtp || undefined} onChange={(e) => patch({ alamatKtp: e.target.value })} /></Field>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox id="dc-sama" checked={f.samaKtp} onCheckedChange={(c) => patch({ samaKtp: !!c })} />
                <Label htmlFor="dc-sama">Alamat domisili sama dengan KTP</Label>
              </div>
              <Field id="dc-domisili" label="Alamat domisili" required={!f.samaKtp} error={errors.alamatDomisili} className="md:col-span-2">
                <Textarea id="dc-domisili" readOnly={f.samaKtp} className={f.samaKtp ? 'bg-muted/50 text-foreground' : undefined} value={f.samaKtp ? f.alamatKtp : f.alamatDomisili} aria-invalid={!!errors.alamatDomisili || undefined} onChange={(e) => patch({ alamatDomisili: e.target.value })} />
              </Field>
              <FormatInput id="dc-hp" label="No. HP" rule="hp" required value={f.hp} error={errors.hp || undefined} onChange={(v) => patch({ hp: v })} onBlur={() => blur('hp')} />
              <FormatInput id="dc-email" label="Email" rule="email" required value={f.email} error={errors.email || undefined} onChange={(v) => patch({ email: v })} onBlur={() => blur('email')} />
              <Field id="dc-dn" label="Kontak darurat: nama" required error={errors.daruratNama}><Input id="dc-dn" value={f.daruratNama} aria-invalid={!!errors.daruratNama || undefined} onChange={(e) => patch({ daruratNama: e.target.value })} /></Field>
              <Field id="dc-dh" label="Kontak darurat: hubungan" required error={errors.daruratHubungan}><Input id="dc-dh" value={f.daruratHubungan} aria-invalid={!!errors.daruratHubungan || undefined} onChange={(e) => patch({ daruratHubungan: e.target.value })} /></Field>
              <FormatInput id="dc-dhp" label="Kontak darurat: No. HP" rule="hp" required value={f.daruratHp} error={errors.daruratHp || undefined} onChange={(v) => patch({ daruratHp: v })} onBlur={() => blur('daruratHp')} />
            </div>
          </SectionCard>

          <SectionCard id="pendidikan" title="4. Pendidikan" description="Pendidikan tertinggi diperiksa terhadap syarat lowongan (peringatan, tidak memblokir).">
            {f.pendidikan.map((p, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field id={`dc-e${i}-j`} label="Jenjang" required>
                    <Select value={p.jenjang} onValueChange={(v) => setEdu(i, { jenjang: v })}><SelectTrigger id={`dc-e${i}-j`} className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{JENJANG.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent></Select>
                  </Field>
                  <Field id={`dc-e${i}-i`} label="Institusi" required className="md:col-span-2"><Input id={`dc-e${i}-i`} value={p.institusi} onChange={(e) => setEdu(i, { institusi: e.target.value })} /></Field>
                  <Field id={`dc-e${i}-u`} label="Jurusan"><Input id={`dc-e${i}-u`} value={p.jurusan} onChange={(e) => setEdu(i, { jurusan: e.target.value })} /></Field>
                  <Field id={`dc-e${i}-t`} label="Tahun lulus"><Input id={`dc-e${i}-t`} inputMode="numeric" value={p.tahun} onChange={(e) => setEdu(i, { tahun: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
                  <Field id={`dc-e${i}-n`} label="Nilai / IPK"><Input id={`dc-e${i}-n`} value={p.nilai} onChange={(e) => setEdu(i, { nilai: e.target.value.replace(/[^\d,.]/g, '').slice(0, 5) })} /></Field>
                </div>
                {f.pendidikan.length > 1 && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => patch({ pendidikan: f.pendidikan.filter((_, j) => j !== i) })}><Trash2 /> Hapus</Button></div>}
              </div>
            ))}
            {errors.pendidikan && <p role="alert" className="text-sm text-danger">{errors.pendidikan}</p>}
            {eduWarn && <Alert variant="warning"><AlertDescription>{eduWarn}</AlertDescription></Alert>}
            <Button variant="outline" onClick={() => patch({ pendidikan: [...f.pendidikan, { ...BLANK_EDU }] })}><Plus /> Tambah pendidikan</Button>
          </SectionCard>

          <SectionCard id="pengalaman" title="5. Pengalaman kerja">
            <div className="flex items-center gap-2">
              <Checkbox id="dc-belum" checked={f.belumBekerja} onCheckedChange={(c) => patch({ belumBekerja: !!c })} />
              <Label htmlFor="dc-belum">Belum pernah bekerja</Label>
            </div>
            {!f.belumBekerja && (
              <>
                {f.pengalaman.map((p, i) => (
                  <div key={i} className="space-y-3 rounded-lg border p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field id={`dc-x${i}-p`} label="Perusahaan"><Input id={`dc-x${i}-p`} value={p.perusahaan} onChange={(e) => setExp(i, { perusahaan: e.target.value })} /></Field>
                      <Field id={`dc-x${i}-s`} label="Posisi"><Input id={`dc-x${i}-s`} value={p.posisi} onChange={(e) => setExp(i, { posisi: e.target.value })} /></Field>
                      <Field id={`dc-x${i}-m`} label="Mulai"><DatePicker id={`dc-x${i}-m`} value={p.mulai} onChange={(v) => setExp(i, { mulai: v })} max={DEMO_TODAY} /></Field>
                      <Field id={`dc-x${i}-e`} label="Selesai"><DatePicker id={`dc-x${i}-e`} value={p.selesai} onChange={(v) => setExp(i, { selesai: v })} max={DEMO_TODAY} /></Field>
                      <Field id={`dc-x${i}-a`} label="Alasan berhenti" className="md:col-span-2"><Input id={`dc-x${i}-a`} value={p.alasan} onChange={(e) => setExp(i, { alasan: e.target.value })} /></Field>
                    </div>
                    {f.pengalaman.length > 1 && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => patch({ pengalaman: f.pengalaman.filter((_, j) => j !== i) })}><Trash2 /> Hapus</Button></div>}
                  </div>
                ))}
                <Button variant="outline" onClick={() => patch({ pengalaman: [...f.pengalaman, { ...BLANK_EXP }] })}><Plus /> Tambah pengalaman</Button>
              </>
            )}
            {errors.pengalaman && <p role="alert" className="text-sm text-danger">{errors.pengalaman}</p>}
          </SectionCard>

          <SectionCard id="skill" title="6. Keterampilan & sertifikat">
            <Field id="dc-skill" label="Keterampilan" helper="Ketik lalu tekan Enter atau Tambah">
              <div className="flex gap-2">
                <Input id="dc-skill" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
                <Button type="button" variant="outline" onClick={addSkill}><Plus /> Tambah</Button>
              </div>
            </Field>
            {f.skills.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Keterampilan">
                {f.skills.map((s) => (
                  <li key={s}><StatusBadge variant="neutral">{s}<button type="button" aria-label={`Hapus ${s}`} className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => patch({ skills: f.skills.filter((x) => x !== s) })}>×</button></StatusBadge></li>
                ))}
              </ul>
            )}
            <Field id="dc-sert" label="Sertifikat (opsional)" helper="PDF, JPG, atau PNG, maksimal 5 MB per file">
              <FilePicker key={f.sertifikat.length} id="dc-sert" {...DOC_ACCEPT} value={null} onChange={(v) => v && patch({ sertifikat: [...f.sertifikat, v] })} />
            </Field>
            {f.sertifikat.length > 0 && (
              <ul className="space-y-1 text-sm">
                {f.sertifikat.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2"><span className="truncate">{s.name}</span><Button variant="ghost" size="icon" aria-label={`Hapus ${s.name}`} onClick={() => patch({ sertifikat: f.sertifikat.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button></li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard id="dokumen" title="7. Dokumen" description="PDF, JPG, atau PNG, maksimal 5 MB per file. Tanda * wajib diunggah.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {DOC_DEFS.map((d) => (
                <Field key={d.key} id={`dc-d-${d.key}`} label={d.label} required={d.wajib} error={sub && d.wajib && !f.docs[d.key] ? `${d.label} wajib diunggah` : undefined}>{docPicker(d.key, `dc-d-${d.key}`)}</Field>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="pernyataan" title="8. Pernyataan">
            <div className="flex items-start gap-3">
              <Checkbox id="dc-setuju" className="mt-0.5" checked={f.setuju} aria-invalid={!!errors.setuju || undefined} onCheckedChange={(c) => patch({ setuju: !!c })} />
              <Label htmlFor="dc-setuju" className="leading-snug">Data yang saya isi benar dan dapat dipertanggungjawabkan. Saya bersedia gugur bila ditemukan data atau dokumen yang tidak sesuai.</Label>
            </div>
            {errors.setuju && <p role="alert" className="text-sm text-danger">{errors.setuju}</p>}
          </SectionCard>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between gap-4 border-t bg-background px-6 py-4">
        <p className="hidden text-sm text-muted-foreground sm:block">{sub && anyError ? 'Masih ada isian wajib yang belum lengkap.' : 'Simpan Draft menyimpan isian tanpa membuat nomor lamaran.'}</p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={simpan}>Simpan Draft</Button>
          <Button onClick={kirim}>Kirim</Button>
        </div>
      </div>
    </div>
  )
}

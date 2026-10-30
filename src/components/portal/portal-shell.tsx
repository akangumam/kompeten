import { useEffect, useRef, useState } from 'react'
import {
  Briefcase, Check, ChevronLeft, ChevronRight, ChevronsUpDown, ClipboardList, Clock, Download,
  Eye, EyeOff, FileText, Info, LogIn, LogOut, Plus, Send, Shield, Trash2, Upload, User, X
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { PortalUjian } from '@/components/portal/portal-ujian'
import { DOC_DEFS, type CandEdu, type DocKey, type Pengalaman, candidateOf, initials } from '@/data/candidates'
import { PORTAL_ACCOUNTS, type PortalSession, accountByEmail, addCandidateToAccount, requestDeletion, sessionFor } from '@/data/portal/accounts'
import { loadExamSession } from '@/data/portal/exam-state'
import { sumberLamaran } from '@/data/master/recruitment'
import { openJobs, jobOf } from '@/data/recruitment/jobs'
import { offerOf, effOfferStatus, type Offer } from '@/data/recruitment/offers'
import { acceptOffer, declineOffer, portalCheckNik, portalRequestDelete, portalReuploadDoc, submitApplication, type Application } from '@/data/recruitment/flow'
import { assignsOf, effTestStatus, paketOf, type TestAssign } from '@/data/recruitment/tests'
import { USERS, type Role } from '@/data/users'
import { formatDate } from '@/lib/format'
import { digitsOnly, formatHp, RULES } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { cn } from '@/lib/utils'

/* ───────────────────────── Types ───────────────────────── */

export type PortalPersona = 'visitor' | 'maya' | 'dewi'

type PortalPageId =
  | 'lowongan-list' | 'lowongan-detail' | 'masuk' | 'daftar' | 'otp'
  | 'apply-form' | 'success-apply' | 'lamaran-list' | 'lamaran-detail'
  | 'tes-list' | 'ujian' | 'akun'

type PortalNav =
  | { id: 'lowongan-list' }
  | { id: 'lowongan-detail'; jobNo: string }
  | { id: 'masuk'; returnJobNo?: string }
  | { id: 'daftar'; returnJobNo?: string; prefillEmail?: string }
  | { id: 'otp'; email: string; nama: string; phone: string; returnJobNo?: string }
  | { id: 'apply-form'; jobNo: string }
  | { id: 'success-apply'; lamaranNo: string; posisi: string }
  | { id: 'lamaran-list' }
  | { id: 'lamaran-detail'; candId: string }
  | { id: 'tes-list' }
  | { id: 'ujian'; assignId: string }
  | { id: 'akun' }

type NavTab = 'lowongan' | 'lamaran' | 'tes' | 'akun'

const PAGE_TITLE: Record<PortalPageId, string> = {
  'lowongan-list': 'Lowongan', 'lowongan-detail': 'Detail Lowongan', masuk: 'Masuk', daftar: 'Daftar Akun',
  otp: 'Verifikasi Email', 'apply-form': 'Form Lamaran', 'success-apply': 'Lamaran Berhasil',
  'lamaran-list': 'Lamaran Saya', 'lamaran-detail': 'Detail Lamaran', 'tes-list': 'Tes Saya',
  ujian: 'Ujian Online', akun: 'Akun Saya',
}

const HR_STAGE_TO_PORTAL: Record<string, string> = {
  'Seleksi Administrasi': 'Seleksi berkas',
  'Tes': 'Tes',
  'Interview': 'Interview',
  'Penawaran': 'Penawaran',
  'Diterima': 'Diterima — selamat bergabung',
  'Ditolak': 'Proses selesai',
  'Batal': 'Proses selesai',
}

const DOC_ACCEPT = { accept: '.pdf,.jpg,.jpeg,.png', extensions: ['pdf', 'jpg', 'jpeg', 'png'], maxBytes: 5 * 1048576, typeError: 'Format file harus PDF, JPG, atau PNG' }
const PHOTO_ACCEPT = { accept: '.jpg,.jpeg,.png', extensions: ['jpg', 'jpeg', 'png'], maxBytes: 5 * 1048576, typeError: 'Format foto harus JPG atau PNG' }

/* ───────────────────────── Root Component ───────────────────────── */

export function PortalShell({
  persona, onSelectPortalPersona, onSelectHRRole,
}: {
  persona: PortalPersona
  onSelectPortalPersona: (p: PortalPersona) => void
  onSelectHRRole: (r: Role) => void
}) {
  const [nav, setNav] = useState<PortalNav>({ id: 'lowongan-list' })
  const [session, setSession] = useState<PortalSession>(() =>
    persona === 'visitor' ? null : sessionFor(persona),
  )
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSession(persona === 'visitor' ? null : sessionFor(persona))
    setNav({ id: 'lowongan-list' })
  }, [persona])

  useEffect(() => {
    document.title = `${PAGE_TITLE[nav.id]} · Karier PT Primaplast`
    mainRef.current?.scrollTo({ top: 0 })
  }, [nav])

  const go = (next: PortalNav) => setNav(next)

  const activeTab: NavTab = nav.id === 'lamaran-list' || nav.id === 'lamaran-detail' || nav.id === 'success-apply' ? 'lamaran'
    : nav.id === 'tes-list' || nav.id === 'ujian' ? 'tes'
    : nav.id === 'akun' ? 'akun'
    : 'lowongan'

  if (nav.id === 'ujian') {
    return <PortalUjian assignId={nav.assignId} onDone={() => go({ id: 'tes-list' })} />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* App Bar */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <img src="/assets/logo-mark.svg" alt="" className="size-8 dark:hidden" aria-hidden />
        <img src="/assets/logo-mark-white.svg" alt="" className="hidden size-8 dark:block" aria-hidden />
        <span className="flex-1 text-sm font-semibold leading-tight">Karier PT Primaplast</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 gap-1 px-3 text-xs">
              Demo <ChevronsUpDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Portal Pelamar</DropdownMenuLabel>
            <DropdownMenuGroup>
              {(['visitor', 'maya', 'dewi'] as PortalPersona[]).map((p) => (
                <DropdownMenuItem key={p} onSelect={() => onSelectPortalPersona(p)}>
                  <Check className={p === persona ? 'size-4' : 'size-4 opacity-0'} />
                  {p === 'visitor' ? 'Pengunjung (belum masuk)' : p === 'maya' ? 'Maya Sari · Pelamar' : 'Dewi Lestari · Pelamar'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Kembali ke HR</DropdownMenuLabel>
            <DropdownMenuGroup>
              {(['admin', 'manager', 'supervisor', 'payroll', 'finance'] as Role[]).map((r) => (
                <DropdownMenuItem key={r} onSelect={() => onSelectHRRole(r)}>
                  <LogOut className="size-4" />
                  {USERS[r].nama} · {USERS[r].jabatan}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {nav.id === 'lowongan-list' && <LowonganList go={go} session={session} />}
          {nav.id === 'lowongan-detail' && <LowonganDetail jobNo={nav.jobNo} go={go} session={session} />}
          {nav.id === 'masuk' && <MasukPage returnJobNo={nav.returnJobNo} go={go} onLogin={(s) => setSession(s)} />}
          {nav.id === 'daftar' && <DaftarPage returnJobNo={nav.returnJobNo} prefillEmail={nav.prefillEmail} go={go} />}
          {nav.id === 'otp' && <OtpPage email={nav.email} nama={nav.nama} phone={nav.phone} returnJobNo={nav.returnJobNo} go={go} onLogin={(s) => setSession(s)} />}
          {nav.id === 'apply-form' && session && <ApplyForm jobNo={nav.jobNo} session={session} go={go} />}
          {nav.id === 'success-apply' && <SuccessApply lamaranNo={nav.lamaranNo} posisi={nav.posisi} go={go} />}
          {nav.id === 'lamaran-list' && session && <LamaranList session={session} go={go} />}
          {nav.id === 'lamaran-detail' && session && <LamaranDetail candId={nav.candId} session={session} go={go} />}
          {nav.id === 'tes-list' && session && <TesList session={session} go={go} />}
          {nav.id === 'akun' && session && <AkunPage session={session} go={go} onLogout={() => { setSession(null); go({ id: 'lowongan-list' }) }} />}
        </div>
      </main>

      {/* Portal Footer */}
      <div className="border-t bg-background px-4 py-3 text-center text-xs text-muted-foreground">
        <span className="cursor-pointer hover:underline" onClick={() => toast.info('Kebijakan Privasi: data pelamar diproses sesuai UU PDP No. 27/2022')}>Kebijakan Privasi</span>
        {' · '}
        <span className="cursor-pointer hover:underline" onClick={() => toast.info('Kontak HRD: hrd@primaplast.co.id · (021) 5555-1234')}>Kontak HRD</span>
        {' · '}© 2026 PT Primaplast Indonesia
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 border-t bg-background md:hidden" aria-label="Navigasi utama">
        {session ? (
          <>
            <NavItem icon={<Briefcase className="size-5" />} label="Lowongan" active={activeTab === 'lowongan'} onClick={() => go({ id: 'lowongan-list' })} />
            <NavItem icon={<ClipboardList className="size-5" />} label="Lamaran" active={activeTab === 'lamaran'} onClick={() => go({ id: 'lamaran-list' })} />
            <NavItem icon={<FileText className="size-5" />} label="Tes" active={activeTab === 'tes'} onClick={() => go({ id: 'tes-list' })} />
            <NavItem icon={<User className="size-5" />} label="Akun" active={activeTab === 'akun'} onClick={() => go({ id: 'akun' })} />
          </>
        ) : (
          <>
            <NavItem icon={<Briefcase className="size-5" />} label="Lowongan" active={activeTab === 'lowongan'} onClick={() => go({ id: 'lowongan-list' })} />
            <NavItem icon={<LogIn className="size-5" />} label="Masuk" active={nav.id === 'masuk' || nav.id === 'daftar'} onClick={() => go({ id: 'masuk' })} />
          </>
        )}
      </nav>

      {/* Desktop top nav links (≥ md) */}
      <div className="fixed bottom-0 left-0 right-0 z-10 hidden items-center justify-center gap-6 border-t bg-background py-2 text-sm md:flex">
        <button className={cn('transition-colors hover:text-foreground', activeTab === 'lowongan' ? 'font-semibold text-foreground' : 'text-muted-foreground')} onClick={() => go({ id: 'lowongan-list' })}>Lowongan</button>
        {session && <>
          <button className={cn('transition-colors hover:text-foreground', activeTab === 'lamaran' ? 'font-semibold text-foreground' : 'text-muted-foreground')} onClick={() => go({ id: 'lamaran-list' })}>Lamaran Saya</button>
          <button className={cn('transition-colors hover:text-foreground', activeTab === 'tes' ? 'font-semibold text-foreground' : 'text-muted-foreground')} onClick={() => go({ id: 'tes-list' })}>Tes Saya</button>
          <button className={cn('transition-colors hover:text-foreground', activeTab === 'akun' ? 'font-semibold text-foreground' : 'text-muted-foreground')} onClick={() => go({ id: 'akun' })}>Akun</button>
        </>}
        {!session && <button className={cn('transition-colors hover:text-foreground', nav.id === 'masuk' ? 'font-semibold text-foreground' : 'text-muted-foreground')} onClick={() => go({ id: 'masuk' })}>Masuk</button>}
      </div>
    </div>
  )
}

/* ───────────────────────── Nav Item ───────────────────────── */
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/* ───────────────────────── Lowongan List ───────────────────────── */
function LowonganList({ go, session }: { go: (n: PortalNav) => void; session: PortalSession }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const jobs = openJobs()
  const depts = [...new Set(jobs.map((j) => j.dept))].sort()
  const filtered = jobs.filter((j) =>
    (!q.trim() || j.posisi.toLowerCase().includes(q.trim().toLowerCase())) &&
    (!dept || j.dept === dept),
  )
  const accountCandIds = session ? (PORTAL_ACCOUNTS.find((a) => a.id === session.accountId)?.candidateIds ?? []) : []
  const alreadyApplied = (jobNo: string) => {
    if (!session) return null
    for (const candId of accountCandIds) {
      const c = candidateOf(candId)
      if (c && c.lowonganId === jobNo) return c.applyDate
    }
    return null
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lowongan Kerja</h1>
        <p className="text-sm text-muted-foreground">PT Primaplast Indonesia · Oktober 2026</p>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Cari posisi..." value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 h-12" />
        <Select value={dept || 'all'} onValueChange={(v) => setDept(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-12 data-[size=default]:h-12"><SelectValue placeholder="Semua" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Dept</SelectItem>{depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada lowongan yang sesuai.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => {
            const applied = alreadyApplied(j.no)
            return (
              <Card
                key={j.no}
                className="cursor-pointer rounded-xl p-4 shadow-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring gap-1"
                role="button"
                tabIndex={0}
                onClick={() => go({ id: 'lowongan-detail', jobNo: j.no })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    go({ id: 'lowongan-detail', jobNo: j.no })
                  }
                }}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="font-semibold">{j.posisi}</span>
                  {applied && <StatusBadge variant="success" className="shrink-0 text-xs">Sudah melamar</StatusBadge>}
                </div>
                <p className="text-sm text-muted-foreground">{j.dept} · {j.jenis} · {j.statusKerja}</p>
                <p className="mt-2 text-xs text-muted-foreground">Batas lamaran {formatDate(j.tutup)}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Lowongan Detail ───────────────────────── */
function LowonganDetail({ jobNo, go, session }: { jobNo: string; go: (n: PortalNav) => void; session: PortalSession }) {
  const job = jobOf(jobNo)
  if (!job) return <p className="text-sm text-muted-foreground">Lowongan tidak ditemukan.</p>
  const accountCandIds = session ? (PORTAL_ACCOUNTS.find((a) => a.id === session.accountId)?.candidateIds ?? []) : []
  const appliedDate = (() => {
    for (const cid of accountCandIds) { const c = candidateOf(cid); if (c && c.lowonganId === jobNo) return c.applyDate }
    return null
  })()
  const STEPS = ['Seleksi berkas', 'Tes', 'Interview', 'Penawaran', 'Diterima']
  const handleLamar = () => {
    if (!session) { go({ id: 'masuk', returnJobNo: jobNo }); return }
    go({ id: 'apply-form', jobNo })
  }
  return (
    <div className="space-y-6 pb-24">
      <div>
        <button className="mb-4 flex min-h-12 items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => go({ id: 'lowongan-list' })}><ChevronLeft className="size-4" />Semua Lowongan</button>
        <h1 className="text-2xl font-semibold tracking-tight">{job.posisi}</h1>
        <p className="text-sm text-muted-foreground">{job.dept} · {job.jenis} · {job.statusKerja}</p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle>Persyaratan</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">Pendidikan min.:</span> {job.syarat.pendidikan}</p>
          <p><span className="font-medium">Usia maks.:</span> {job.syarat.usiaMax} tahun</p>
          <p><span className="font-medium">Pengalaman:</span> {job.syarat.pengalaman}</p>
          {job.syarat.catatan && <p className="text-muted-foreground">{job.syarat.catatan}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle>Tahapan Seleksi</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative ml-3 space-y-4 border-l border-border pl-5 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="absolute -left-2 flex size-4 items-center justify-center rounded-full border bg-background text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle>Dokumen yang Diperlukan</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {DOC_DEFS.map((d) => (
              <li key={d.key} className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', d.wajib ? 'bg-primary' : 'bg-muted-foreground')} />
                {d.label}{!d.wajib && <span className="text-xs text-muted-foreground">(opsional)</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Sticky apply button */}
      <div className="fixed bottom-16 left-0 right-0 z-10 border-t bg-background px-4 py-3 md:bottom-10">
        <div className="mx-auto max-w-2xl">
          {appliedDate ? (
            <Button className="h-12 w-full" disabled>
              Anda sudah melamar posisi ini pada {formatDate(appliedDate)}
            </Button>
          ) : (
            <Button className="h-12 w-full" onClick={handleLamar}>
              Lamar Sekarang
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Masuk ───────────────────────── */
function MasukPage({ returnJobNo, go, onLogin }: { returnJobNo?: string; go: (n: PortalNav) => void; onLogin: (s: PortalSession) => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [sub, setSub] = useState(false)
  const eEmail = !RULES.email.valid(email) ? RULES.email.error : ''
  const ePw = pw.length < 8 ? 'Kata sandi minimal 8 karakter' : ''
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setSub(true)
    if (eEmail || ePw) return
    const acc = accountByEmail(email)
    if (acc) {
      onLogin({ accountId: acc.id, email: acc.email, nama: acc.nama, phone: acc.phone })
      toast.success(`Selamat datang, ${acc.nama}!`)
      if (returnJobNo) go({ id: 'apply-form', jobNo: returnJobNo })
      else go({ id: 'lamaran-list' })
    } else {
      toast.error('Email atau kata sandi tidak cocok.')
    }
  }
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Masuk</h1><p className="text-sm text-muted-foreground">Masuk ke akun portal karier Anda</p></div>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="m-email">Email *</Label>
          <Input id="m-email" type="email" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!(sub && eEmail) || undefined} />
          {sub && eEmail && <p className="text-sm text-danger">{eEmail}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-pw">Kata Sandi *</Label>
          <div className="relative">
            <Input id="m-pw" type={show ? 'text' : 'password'} className="h-12 pr-10" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!(sub && ePw) || undefined} />
            <button type="button" className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-muted-foreground" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {sub && ePw && <p className="text-sm text-danger">{ePw}</p>}
        </div>
        <button type="button" className="inline-flex min-h-12 items-center text-sm text-primary hover:underline" onClick={() => toast.info('Tautan reset kata sandi dikirim ke email Anda (demo)')}>Lupa kata sandi?</button>
        <Button type="submit" className="h-12 w-full">Masuk</Button>
      </form>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <button className="inline-flex min-h-12 items-center font-medium text-primary hover:underline" onClick={() => go({ id: 'daftar', returnJobNo, prefillEmail: email })}>Daftar</button>
      </p>
    </div>
  )
}

/* ───────────────────────── Daftar ───────────────────────── */
function DaftarPage({ returnJobNo, prefillEmail, go }: { returnJobNo?: string; prefillEmail?: string; go: (n: PortalNav) => void }) {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [setuju, setSetuju] = useState(false)
  const [sub, setSub] = useState(false)
  const eNama = !nama.trim() ? 'Nama wajib diisi' : ''
  const eEmail = !RULES.email.valid(email) ? RULES.email.error : ''
  const ePhone = !RULES.hp.valid(digitsOnly(phone)) ? RULES.hp.error : ''
  const ePw = pw.length < 8 ? 'Kata sandi minimal 8 karakter' : ''
  const eSetuju = !setuju ? 'Anda harus menyetujui kebijakan privasi' : ''
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setSub(true)
    if (eNama || eEmail || ePhone || ePw || eSetuju) return
    go({ id: 'otp', email, nama, phone: digitsOnly(phone), returnJobNo })
  }
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Daftar Akun</h1><p className="text-sm text-muted-foreground">Buat akun untuk melamar pekerjaan di PT Primaplast</p></div>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="d-nama">Nama Lengkap *</Label>
          <Input id="d-nama" className="h-12" value={nama} onChange={(e) => setNama(e.target.value)} aria-invalid={!!(sub && eNama) || undefined} />
          {sub && eNama && <p className="text-sm text-danger">{eNama}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-email">Email *</Label>
          <Input id="d-email" type="email" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!(sub && eEmail) || undefined} />
          {sub && eEmail && <p className="text-sm text-danger">{eEmail}</p>}
          <p className="text-xs text-muted-foreground">Kode verifikasi akan dikirim ke email ini</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-phone">Nomor HP *</Label>
          <Input id="d-phone" inputMode="tel" className="h-12" value={phone} onChange={(e) => setPhone(formatHp(e.target.value))} aria-invalid={!!(sub && ePhone) || undefined} placeholder="0812-3456-7890" />
          {sub && ePhone ? <p className="text-sm text-danger">{ePhone}</p> : <p className="text-xs text-muted-foreground">{RULES.hp.helper}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-pw">Kata Sandi *</Label>
          <div className="relative">
            <Input id="d-pw" type={show ? 'text' : 'password'} className="h-12 pr-10" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!(sub && ePw) || undefined} />
            <button type="button" className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-muted-foreground" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan' : 'Tampilkan'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {sub && ePw ? <p className="text-sm text-danger">{ePw}</p> : <p className="text-xs text-muted-foreground">Minimal 8 karakter</p>}
        </div>
        <div className="flex min-h-12 items-start gap-3">
          <Checkbox id="d-setuju" checked={setuju} onCheckedChange={(v) => setSetuju(!!v)} aria-invalid={!!(sub && eSetuju) || undefined} />
          <label htmlFor="d-setuju" className="text-sm leading-relaxed">
            Saya menyetujui{' '}
            <button type="button" className="text-primary hover:underline" onClick={() => toast.info('Kebijakan Privasi: data Anda diproses sesuai UU PDP No. 27/2022 hanya untuk keperluan rekrutmen.')}>
              Kebijakan Privasi
            </button>{' '}
            dan pemrosesan data pribadi untuk rekrutmen
          </label>
        </div>
        {sub && eSetuju && <p className="text-sm text-danger">{eSetuju}</p>}
        <Button type="submit" className="h-12 w-full">Daftar &amp; Kirim Kode OTP</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun? <button className="inline-flex min-h-12 items-center font-medium text-primary hover:underline" onClick={() => go({ id: 'masuk', returnJobNo })}>Masuk</button>
      </p>
    </div>
  )
}

/* ───────────────────────── OTP ───────────────────────── */
function OtpPage({ email, nama, phone, returnJobNo, go, onLogin }: { email: string; nama: string; phone: string; returnJobNo?: string; go: (n: PortalNav) => void; onLogin: (s: PortalSession) => void }) {
  const [otp, setOtp] = useState('')
  const [sub, setSub] = useState(false)
  useEffect(() => { toast.info(`Kode demo: 123456 (dikirim ke ${email})`) }, [email])
  const eOtp = otp !== '123456' ? 'Kode tidak valid' : ''
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault(); setSub(true)
    if (eOtp) return
    const session: PortalSession = { accountId: `new-${Date.now()}`, email, nama, phone }
    onLogin(session)
    toast.success('Akun berhasil dibuat! Selamat datang.')
    if (returnJobNo) go({ id: 'apply-form', jobNo: returnJobNo })
    else go({ id: 'lowongan-list' })
  }
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Verifikasi Email</h1><p className="text-sm text-muted-foreground">Kode verifikasi dikirim ke <strong>{email}</strong></p></div>
      <Alert><Info className="size-4" /><AlertTitle>Kode Demo</AlertTitle><AlertDescription>Masukkan <strong>123456</strong> untuk melanjutkan demo.</AlertDescription></Alert>
      <form className="space-y-4" onSubmit={handleVerify} noValidate>
        <div className="space-y-2">
          <Label htmlFor="otp">Kode OTP *</Label>
          <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))} aria-invalid={!!(sub && eOtp) || undefined} placeholder="6 digit" className="h-12 text-center text-xl tracking-[0.3em]" />
          {sub && eOtp && <p className="text-sm text-danger">{eOtp}</p>}
        </div>
        <Button type="submit" className="h-12 w-full">Verifikasi</Button>
        <button type="button" className="flex h-12 w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground" onClick={() => toast.info(`Kode demo: 123456 (dikirim ulang ke ${email})`)}>Kirim ulang kode</button>
      </form>
    </div>
  )
}

/* ───────────────────────── Apply Form ───────────────────────── */
type ApplyForm = {
  lowonganId: string; sumber: string; nama: string; ktp: string; tempatLahir: string; tanggalLahir: string
  gender: string; pernikahan: string; tanggungan: string; alamatKtp: string; samaKtp: boolean; alamatDomisili: string
  hp: string; email: string; daruratNama: string; daruratHubungan: string; daruratHp: string
  pendidikan: CandEdu[]; pengalaman: Pengalaman[]; belumBekerja: boolean; skills: string[]; newSkill: string
  docs: Partial<Record<DocKey, PickedFile>>; setuju: boolean
}
const BLANK_EDU: CandEdu = { jenjang: '', institusi: '', jurusan: '', tahun: '', nilai: '' }
const BLANK_EXP: Pengalaman = { perusahaan: '', posisi: '', mulai: '', selesai: '', alasan: '' }
const JENJANG = ['SD', 'SMP', 'SMA', 'SMK', 'D3', 'S1', 'S2']
const STEPS = [
  'Lamaran', 'Data pribadi', 'Alamat & kontak', 'Pendidikan',
  'Pengalaman kerja', 'Keterampilan', 'Dokumen', 'Pernyataan',
]

function ApplyForm({ jobNo, session, go }: { jobNo: string; session: PortalSession; go: (n: PortalNav) => void }) {
  const job = jobOf(jobNo)
  const [step, setStep] = useState(0)
  const [lastSaved, setLastSaved] = useState('')
  const [nikWarn, setNikWarn] = useState('')
  const [nikBlock, setNikBlock] = useState('')
  const [sub, setSub] = useState(false)
  const [form, setForm] = useState<ApplyForm>(() => ({
    lowonganId: jobNo, sumber: 'Portal KOMPETEN', nama: session?.nama ?? '', ktp: '', tempatLahir: '', tanggalLahir: '',
    gender: '', pernikahan: '', tanggungan: '0', alamatKtp: '', samaKtp: false, alamatDomisili: '',
    hp: session?.phone ?? '', email: session?.email ?? '', daruratNama: '', daruratHubungan: '', daruratHp: '',
    pendidikan: [{ ...BLANK_EDU }], pengalaman: [{ ...BLANK_EXP }], belumBekerja: false, skills: [], newSkill: '',
    docs: {}, setuju: false,
  }))

  const upd = <K extends keyof ApplyForm>(k: K, v: ApplyForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    const now = new Date()
    setLastSaved(`Tersimpan otomatis · ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`)
  }

  const checkKtp = () => {
    if (form.ktp.length !== 16) { setNikWarn(''); setNikBlock(''); return }
    const warn = portalCheckNik(form.ktp, jobNo)
    if (!warn) { setNikWarn(''); setNikBlock(''); return }
    if (warn.kind === 'active-employee') setNikBlock('Lamaran tidak dapat diproses melalui portal. Silakan hubungi HRD.')
    else if (warn.kind === 'already-applied') setNikBlock(`Anda sudah melamar posisi ini pada ${formatDate(warn.tanggal!)}.`)
    else setNikWarn('')
  }

  const validateStep = () => {
    setSub(true)
    if (step === 0 && (!form.lowonganId || !form.sumber)) return false
    if (step === 1 && (!form.nama.trim() || form.ktp.length !== 16 || !form.gender || !form.pernikahan || !form.tanggalLahir || !form.tempatLahir || nikBlock)) return false
    if (step === 2 && (!form.alamatKtp.trim() || (!form.samaKtp && !form.alamatDomisili.trim()) || !RULES.hp.valid(digitsOnly(form.hp)) || !RULES.email.valid(form.email))) return false
    if (step === 3 && form.pendidikan.some((p) => !p.jenjang || !p.institusi || !p.jurusan || !p.tahun)) return false
    if (step === 7 && !form.setuju) return false
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setSub(false)
    if (step < STEPS.length - 1) { setStep(step + 1); return }
    // Submit
    const requiredDocs = DOC_DEFS.filter((d) => d.wajib)
    if (requiredDocs.some((d) => !form.docs[d.key])) { toast.error('Lengkapi semua dokumen wajib'); return }
    const docs = DOC_DEFS.filter((d) => form.docs[d.key]).map((d) => ({ key: d.key, file: form.docs[d.key]!.name, size: form.docs[d.key]!.size }))
    const app: Application = {
      lowonganId: form.lowonganId, sumber: 'Portal KOMPETEN', nama: form.nama.trim(), ktp: form.ktp,
      tempatLahir: form.tempatLahir.trim(), tanggalLahir: form.tanggalLahir, gender: form.gender,
      pernikahan: form.pernikahan, tanggungan: Number(form.tanggungan),
      alamatKtp: form.alamatKtp.trim(), alamatDomisili: form.samaKtp ? form.alamatKtp.trim() : form.alamatDomisili.trim(),
      phone: digitsOnly(form.hp), email: form.email.trim(),
      darurat: { nama: form.daruratNama.trim(), hubungan: form.daruratHubungan.trim(), hp: digitsOnly(form.daruratHp) },
      pendidikan: form.pendidikan.filter((p) => p.jenjang), pengalaman: form.belumBekerja ? [] : form.pengalaman.filter((p) => p.perusahaan),
      belumBekerja: form.belumBekerja, skills: form.skills, docs,
    }
    const cand = submitApplication(app, session?.nama ?? 'Pelamar')
    if (!cand) { toast.error('Gagal mengirim lamaran. Coba lagi.'); return }
    if (session) addCandidateToAccount(session.accountId, cand.id)
    go({ id: 'success-apply', lamaranNo: cand.id, posisi: job?.posisi ?? '' })
  }

  if (!job) return <p className="text-sm text-muted-foreground">Lowongan tidak ditemukan.</p>

  return (
    <div className="space-y-4">
      <button className="flex min-h-12 items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => go({ id: 'lowongan-detail', jobNo })}><ChevronLeft className="size-4" />Kembali</button>
      <div>
        <p className="text-xs text-muted-foreground">Langkah {step + 1} dari {STEPS.length}</p>
        <h1 className="text-xl font-semibold">{STEPS[step]}</h1>
        {lastSaved && <p className="text-xs text-muted-foreground">{lastSaved}</p>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="space-y-4">
        {/* Step 0: Lamaran */}
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label>Posisi yang dilamar</Label>
              <div className="flex min-h-12 items-center rounded-md border bg-muted/50 px-3 py-2 text-sm">{job.posisi} · {job.dept}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-sumber">Sumber informasi lowongan *</Label>
              <Select value={form.sumber} onValueChange={(v) => upd('sumber', v)}>
                <SelectTrigger id="s-sumber" className="h-12 data-[size=default]:h-12"><SelectValue /></SelectTrigger>
                <SelectContent>{sumberLamaran().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Step 1: Data pribadi */}
        {step === 1 && (
          <>
            <FieldRow><Label htmlFor="s-nama">Nama lengkap *</Label><Input id="s-nama" className="h-12" value={form.nama} onChange={(e) => upd('nama', e.target.value)} aria-invalid={!!(sub && !form.nama.trim()) || undefined} />{sub && !form.nama.trim() && <Err>Nama wajib diisi</Err>}</FieldRow>
            <FieldRow>
              <Label htmlFor="s-ktp">NIK (KTP) *</Label>
              <Input id="s-ktp" className="h-12" inputMode="numeric" maxLength={16} value={form.ktp} onChange={(e) => upd('ktp', digitsOnly(e.target.value).slice(0, 16))} onBlur={checkKtp} aria-invalid={!!(sub && form.ktp.length !== 16) || !!nikBlock || undefined} placeholder="16 digit" />
              {nikBlock ? <Err>{nikBlock}</Err> : sub && form.ktp.length !== 16 ? <Err>NIK harus 16 digit</Err> : <p className="text-xs text-muted-foreground">16 digit angka sesuai KTP</p>}
            </FieldRow>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow><Label htmlFor="s-tlahir">Tempat lahir *</Label><Input id="s-tlahir" className="h-12" value={form.tempatLahir} onChange={(e) => upd('tempatLahir', e.target.value)} />{sub && !form.tempatLahir.trim() && <Err>Wajib diisi</Err>}</FieldRow>
              <FieldRow><Label htmlFor="s-tgl">Tanggal lahir *</Label><Input id="s-tgl" className="h-12" type="date" value={form.tanggalLahir} onChange={(e) => upd('tanggalLahir', e.target.value)} />{sub && !form.tanggalLahir && <Err>Wajib diisi</Err>}</FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow><Label htmlFor="s-gender">Jenis kelamin *</Label><Select value={form.gender} onValueChange={(v) => upd('gender', v)}><SelectTrigger id="s-gender" className="h-12 data-[size=default]:h-12"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select>{sub && !form.gender && <Err>Wajib dipilih</Err>}</FieldRow>
              <FieldRow><Label htmlFor="s-nikah">Status pernikahan *</Label><Select value={form.pernikahan} onValueChange={(v) => upd('pernikahan', v)}><SelectTrigger id="s-nikah" className="h-12 data-[size=default]:h-12"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{['Belum Menikah', 'Menikah', 'Janda/Duda'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>{sub && !form.pernikahan && <Err>Wajib dipilih</Err>}</FieldRow>
            </div>
          </>
        )}

        {/* Step 2: Alamat & kontak */}
        {step === 2 && (
          <>
            <FieldRow><Label htmlFor="s-aktp">Alamat sesuai KTP *</Label><Textarea id="s-aktp" value={form.alamatKtp} onChange={(e) => upd('alamatKtp', e.target.value)} rows={3} />{sub && !form.alamatKtp.trim() && <Err>Alamat wajib diisi</Err>}</FieldRow>
            <div className="flex min-h-12 items-center gap-2">
              <Checkbox id="s-same" checked={form.samaKtp} onCheckedChange={(v) => upd('samaKtp', !!v)} />
              <label htmlFor="s-same" className="text-sm">Alamat domisili sama dengan KTP</label>
            </div>
            {!form.samaKtp && <FieldRow><Label htmlFor="s-adom">Alamat domisili *</Label><Textarea id="s-adom" value={form.alamatDomisili} onChange={(e) => upd('alamatDomisili', e.target.value)} rows={3} /></FieldRow>}
            <FieldRow>
              <Label htmlFor="s-hp">Nomor HP *</Label>
              <Input id="s-hp" className="h-12" inputMode="tel" value={form.hp} onChange={(e) => upd('hp', formatHp(e.target.value))} aria-invalid={!!(sub && !RULES.hp.valid(digitsOnly(form.hp))) || undefined} placeholder="0812-3456-7890" />
              {sub && !RULES.hp.valid(digitsOnly(form.hp)) ? <Err>{RULES.hp.error}</Err> : <p className="text-xs text-muted-foreground">{RULES.hp.helper}</p>}
            </FieldRow>
            <FieldRow>
              <Label htmlFor="s-email">Email *</Label>
              <Input id="s-email" className="h-12" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} aria-invalid={!!(sub && !RULES.email.valid(form.email)) || undefined} />
              {sub && !RULES.email.valid(form.email) && <Err>{RULES.email.error}</Err>}
            </FieldRow>
            <div className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">Kontak darurat</p>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow><Label htmlFor="s-dnam">Nama *</Label><Input id="s-dnam" className="h-12" value={form.daruratNama} onChange={(e) => upd('daruratNama', e.target.value)} /></FieldRow>
                <FieldRow><Label htmlFor="s-dhub">Hubungan *</Label><Input id="s-dhub" className="h-12" value={form.daruratHubungan} onChange={(e) => upd('daruratHubungan', e.target.value)} /></FieldRow>
              </div>
              <FieldRow><Label htmlFor="s-dhp">No. HP *</Label><Input id="s-dhp" className="h-12" inputMode="tel" value={form.daruratHp} onChange={(e) => upd('daruratHp', formatHp(e.target.value))} /></FieldRow>
            </div>
          </>
        )}

        {/* Step 3: Pendidikan */}
        {step === 3 && (
          <>
            {form.pendidikan.map((p, i) => (
              <div key={i} className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Riwayat Pendidikan {i + 1}</p>
                  {form.pendidikan.length > 1 && <Button variant="ghost" size="icon" className="size-12" onClick={() => upd('pendidikan', form.pendidikan.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow><Label>Jenjang *</Label><Select value={p.jenjang} onValueChange={(v) => upd('pendidikan', form.pendidikan.map((x, j) => j === i ? { ...x, jenjang: v } : x))}><SelectTrigger className="h-12 data-[size=default]:h-12"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{JENJANG.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent></Select></FieldRow>
                  <FieldRow><Label>Tahun lulus *</Label><Input className="h-12" inputMode="numeric" maxLength={4} value={p.tahun} onChange={(e) => upd('pendidikan', form.pendidikan.map((x, j) => j === i ? { ...x, tahun: e.target.value.replace(/\D/g, '').slice(0, 4) } : x))} /></FieldRow>
                </div>
                <FieldRow><Label>Institusi *</Label><Input className="h-12" value={p.institusi} onChange={(e) => upd('pendidikan', form.pendidikan.map((x, j) => j === i ? { ...x, institusi: e.target.value } : x))} /></FieldRow>
                <FieldRow><Label>Jurusan *</Label><Input className="h-12" value={p.jurusan} onChange={(e) => upd('pendidikan', form.pendidikan.map((x, j) => j === i ? { ...x, jurusan: e.target.value } : x))} /></FieldRow>
                <FieldRow><Label>IPK / Nilai</Label><Input className="h-12" value={p.nilai} onChange={(e) => upd('pendidikan', form.pendidikan.map((x, j) => j === i ? { ...x, nilai: e.target.value } : x))} /></FieldRow>
              </div>
            ))}
            <Button variant="outline" className="h-12 w-full gap-2" onClick={() => upd('pendidikan', [...form.pendidikan, { ...BLANK_EDU }])}><Plus className="size-4" />Tambah Pendidikan</Button>
          </>
        )}

        {/* Step 4: Pengalaman */}
        {step === 4 && (
          <>
            <div className="flex min-h-12 items-center gap-2">
              <Checkbox id="s-belum" checked={form.belumBekerja} onCheckedChange={(v) => upd('belumBekerja', !!v)} />
              <label htmlFor="s-belum" className="text-sm">Belum pernah bekerja</label>
            </div>
            {!form.belumBekerja && form.pengalaman.map((p, i) => (
              <div key={i} className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Pengalaman {i + 1}</p>
                  {form.pengalaman.length > 1 && <Button variant="ghost" size="icon" className="size-12" onClick={() => upd('pengalaman', form.pengalaman.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>}
                </div>
                <FieldRow><Label>Perusahaan *</Label><Input className="h-12" value={p.perusahaan} onChange={(e) => upd('pengalaman', form.pengalaman.map((x, j) => j === i ? { ...x, perusahaan: e.target.value } : x))} /></FieldRow>
                <FieldRow><Label>Posisi *</Label><Input className="h-12" value={p.posisi} onChange={(e) => upd('pengalaman', form.pengalaman.map((x, j) => j === i ? { ...x, posisi: e.target.value } : x))} /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow><Label>Mulai</Label><Input className="h-12" type="month" value={p.mulai} onChange={(e) => upd('pengalaman', form.pengalaman.map((x, j) => j === i ? { ...x, mulai: e.target.value } : x))} /></FieldRow>
                  <FieldRow><Label>Selesai</Label><Input className="h-12" type="month" value={p.selesai} onChange={(e) => upd('pengalaman', form.pengalaman.map((x, j) => j === i ? { ...x, selesai: e.target.value } : x))} /></FieldRow>
                </div>
                <FieldRow><Label>Alasan berhenti</Label><Input className="h-12" value={p.alasan} onChange={(e) => upd('pengalaman', form.pengalaman.map((x, j) => j === i ? { ...x, alasan: e.target.value } : x))} /></FieldRow>
              </div>
            ))}
            {!form.belumBekerja && <Button variant="outline" className="h-12 w-full gap-2" onClick={() => upd('pengalaman', [...form.pengalaman, { ...BLANK_EXP }])}><Plus className="size-4" />Tambah Pengalaman</Button>}
          </>
        )}

        {/* Step 5: Keterampilan */}
        {step === 5 && (
          <>
            <div className="space-y-3">
              <Label htmlFor="s-skill">Tambah keterampilan</Label>
              <div className="flex gap-2">
                <Input id="s-skill" className="h-12" value={form.newSkill} placeholder="e.g. Microsoft Excel" onChange={(e) => upd('newSkill', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = form.newSkill.trim(); if (v && !form.skills.includes(v)) upd('skills', [...form.skills, v]); upd('newSkill', '') } }} />
                <Button variant="outline" className="h-12 px-5" onClick={() => { const v = form.newSkill.trim(); if (v && !form.skills.includes(v)) upd('skills', [...form.skills, v]); upd('newSkill', '') }}>Tambah</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium">
                    {s}<button type="button" className="flex size-4 items-center justify-center" aria-label={`Hapus ${s}`} onClick={() => upd('skills', form.skills.filter((x) => x !== s))}><X className="size-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 6: Dokumen */}
        {step === 6 && (
          <div className="space-y-4">
            {DOC_DEFS.map((d) => {
              const isPhoto = d.key === 'foto'
              const acc = isPhoto ? PHOTO_ACCEPT : DOC_ACCEPT
              return (
                <div key={d.key} className="space-y-1">
                  <Label htmlFor={`doc-${d.key}`}>{d.label}{d.wajib && ' *'}</Label>
                  <FilePicker id={`doc-${d.key}`} size="touch" {...acc} value={form.docs[d.key] ?? null} onChange={(f) => upd('docs', { ...form.docs, [d.key]: f ?? undefined })} />
                  {!isPhoto && <p className="text-xs text-muted-foreground">Format PDF, JPG, atau PNG · maks. 5 MB</p>}
                  {isPhoto && <p className="text-xs text-muted-foreground">Format JPG atau PNG · maks. 5 MB · tampak depan, latar polos</p>}
                  {sub && d.wajib && !form.docs[d.key] && <p className="text-sm text-danger">Dokumen ini wajib diunggah</p>}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 7: Pernyataan */}
        {step === 7 && (
          <div className="space-y-4">
            <Alert><Shield className="size-4" /><AlertTitle>Pernyataan Pelamar</AlertTitle><AlertDescription className="text-sm">Dengan mengirim lamaran ini, saya menyatakan bahwa semua informasi yang saya berikan adalah benar dan dapat dipertanggungjawabkan.</AlertDescription></Alert>
            <div className="flex min-h-12 items-start gap-3">
              <Checkbox id="s-setuju" checked={form.setuju} onCheckedChange={(v) => upd('setuju', !!v)} aria-invalid={!!(sub && !form.setuju) || undefined} />
              <label htmlFor="s-setuju" className="text-sm leading-relaxed">Saya menyatakan bahwa data yang saya isi adalah benar, dan saya menyetujui pemrosesan data pribadi untuk keperluan rekrutmen sesuai Kebijakan Privasi PT Primaplast Indonesia.</label>
            </div>
            {sub && !form.setuju && <Err>Anda harus mencentang pernyataan ini</Err>}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        {step > 0 && <Button variant="outline" className="h-12 flex-1" onClick={() => { setSub(false); setStep(step - 1) }}><ChevronLeft className="size-4" />Kembali</Button>}
        <Button className="h-12 flex-1" onClick={handleNext}>
          {step < STEPS.length - 1 ? <><span>Lanjut</span><ChevronRight className="size-4" /></> : <><Send className="size-4" /><span>Kirim Lamaran</span></>}
        </Button>
      </div>
    </div>
  )
}

/* ───────────────────────── Success Apply ───────────────────────── */
function SuccessApply({ lamaranNo, posisi, go }: { lamaranNo: string; posisi: string; go: (n: PortalNav) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-success/10"><CheckCircle2 className="size-10 text-success" /></div>
      <div><h1 className="text-2xl font-semibold">Lamaran Berhasil Dikirim!</h1><p className="mt-1 text-sm text-muted-foreground">Nomor lamaran Anda: <strong>{lamaranNo}</strong></p></div>
      <Card className="w-full max-w-sm rounded-xl shadow-sm text-left">
        <CardHeader><CardTitle>Langkah Selanjutnya</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span><span>Tim HR akan memverifikasi dokumen lamaran Anda</span></div>
          <div className="flex gap-2"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground font-bold">2</span><span>Jika lulus seleksi berkas, Anda akan diundang untuk mengikuti tes</span></div>
          <div className="flex gap-2"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground font-bold">3</span><span>Pantau perkembangan lamaran Anda di menu Lamaran Saya</span></div>
        </CardContent>
      </Card>
      <Button className="h-12 w-full max-w-sm" onClick={() => go({ id: 'lamaran-list' })}>Lihat Lamaran Saya</Button>
      <Button variant="outline" className="h-12 w-full max-w-sm" onClick={() => go({ id: 'lowongan-list' })}>Lihat Lowongan Lain</Button>
    </div>
  )
}

/* ───────────────────────── Lamaran List ───────────────────────── */
function LamaranList({ session, go }: { session: PortalSession; go: (n: PortalNav) => void }) {
  if (!session) return null
  const account = PORTAL_ACCOUNTS.find((a) => a.id === session.accountId)
  const candIds = account?.candidateIds ?? []
  const cands = candIds.map((id) => candidateOf(id)).filter(Boolean)
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Lamaran Saya</h1><p className="text-sm text-muted-foreground">{cands.length} lamaran aktif</p></div>
      {cands.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada lamaran. Cari lowongan yang sesuai!</p>
          <Button variant="outline" className="mt-4 h-12" onClick={() => go({ id: 'lowongan-list' })}>Lihat Lowongan</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cands.map((c) => {
            if (!c) return null
            const stageLabel = HR_STAGE_TO_PORTAL[c.stage] ?? c.stage
            const variant = c.stage === 'Diterima' ? 'success' : c.stage === 'Ditolak' || c.stage === 'Batal' ? 'neutral' : 'info'
            return (
              <Card key={c.id} className="cursor-pointer rounded-xl shadow-sm hover:bg-accent/50" role="button" tabIndex={0} onClick={() => go({ id: 'lamaran-detail', candId: c.id })} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go({ id: 'lamaran-detail', candId: c.id }))}>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-semibold">{c.posisi}</span>
                    <StatusBadge variant={variant} className="shrink-0">{stageLabel}</StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{c.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Diperbarui {formatDate(c.history[c.history.length - 1]?.date ?? c.applyDate)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Lamaran Detail ───────────────────────── */
function LamaranDetail({ candId, session, go }: { candId: string; session: PortalSession; go: (n: PortalNav) => void }) {
  const c = candidateOf(candId)
  const [reuploadKey, setReuploadKey] = useState<DocKey | null>(null)
  const [reuploadFile, setReuploadFile] = useState<PickedFile | null>(null)
  const [offerConfirm, setOfferConfirm] = useState(false)
  const [offerConfirmCheck, setOfferConfirmCheck] = useState(false)
  const [declineDialog, setDeclineDialog] = useState(false)
  const [declineAlasan, setDeclineAlasan] = useState('')
  const [questionDialog, setQuestionDialog] = useState(false)
  const [questionText, setQuestionText] = useState('')

  if (!c) return <p className="text-sm text-muted-foreground">Lamaran tidak ditemukan.</p>

  const offer = c.offerId ? offerOf(c.offerId) : undefined
  const offerEff = offer ? effOfferStatus(offer) : undefined

  const stageHistory = c.history.filter((h) => h.stage)
  const isFinal = c.stage === 'Diterima' || c.stage === 'Ditolak' || c.stage === 'Batal'
  const rejectedDocs = c.docs.filter((d) => d.status === 'Ditolak')

  const handleAcceptOffer = () => {
    if (!offer) return
    acceptOffer(offer.id, DEMO_TODAY, { name: 'Penawaran diterima via Portal', size: 0 }, session?.nama ?? 'Pelamar')
    setOfferConfirm(false)
    toast.success('Penawaran diterima. Selamat bergabung di PT Primaplast!')
  }
  const handleDeclineOffer = () => {
    if (!offer || declineAlasan.trim().length < 10) return
    declineOffer(offer.id, DEMO_TODAY, declineAlasan.trim(), session?.nama ?? 'Pelamar')
    setDeclineDialog(false)
    toast.info('Penolakan penawaran telah dicatat.')
  }
  const handleReupload = () => {
    if (!reuploadKey || !reuploadFile) return
    portalReuploadDoc(candId, reuploadKey, reuploadFile)
    toast.success('Dokumen berhasil diunggah ulang. Menunggu verifikasi HRD.')
    setReuploadKey(null); setReuploadFile(null)
  }

  return (
    <div className="space-y-6">
      <button className="flex min-h-12 items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => go({ id: 'lamaran-list' })}><ChevronLeft className="size-4" />Lamaran Saya</button>
      <div>
        <h1 className="text-xl font-semibold">{c.posisi}</h1>
        <p className="text-xs text-muted-foreground tabular-nums">{c.id} · Dilamar {formatDate(c.applyDate)}</p>
      </div>

      {/* Rejected docs */}
      {rejectedDocs.length > 0 && (
        <Alert variant="destructive">
          <Upload className="size-4" />
          <AlertTitle>Dokumen Perlu Diunggah Ulang</AlertTitle>
          <AlertDescription className="space-y-2">
            {rejectedDocs.map((d) => (
              <div key={d.key} className="space-y-1">
                <p className="text-sm font-medium">{DOC_DEFS.find((x) => x.key === d.key)?.label}: <span className="font-normal">{d.alasan}</span></p>
                <Button variant="outline" size="sm" className="h-12 gap-2" onClick={() => { setReuploadKey(d.key); setReuploadFile(null) }}>
                  <Upload className="size-4" />Unggah Ulang
                </Button>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader><CardTitle>Status Lamaran</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative ml-3 space-y-4 border-l border-border pl-5">
            {stageHistory.map((h, i) => {
              const portalLabel = HR_STAGE_TO_PORTAL[h.stage!] ?? h.stage
              const isCurrent = i === stageHistory.length - 1 && !isFinal
              const isDone = i < stageHistory.length - 1 || isFinal
              const isReject = h.stage === 'Ditolak' || h.stage === 'Batal'
              return (
                <li key={i} className={cn('text-sm', isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  <span className={cn('absolute -left-2 flex size-4 items-center justify-center rounded-full border', isDone ? isReject ? 'border-border bg-secondary' : 'border-success bg-success/10' : 'border-primary bg-primary')} />
                  <p className={cn(isReject ? 'text-muted-foreground' : isCurrent ? 'text-foreground' : 'text-muted-foreground')}>{portalLabel}</p>
                  <p className="text-xs tabular-nums">{formatDate(h.date)}</p>
                  {isReject && h.stage === 'Ditolak' && <p className="mt-1 text-xs text-muted-foreground">Terima kasih atas minat Anda. Lamaran belum dapat kami lanjutkan.</p>}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Interview info */}
      {c.stage === 'Interview' && c.interview && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle>Jadwal Interview</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="font-medium">{formatDate(c.interview.tanggal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Pukul</p><p className="font-medium">{c.interview.jam} WIB</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground">Lokasi</p><p className="font-medium">{c.interview.lokasi}</p></div>
            <Button variant="outline" className="h-12 gap-2 w-full" onClick={() => {
              const dtstart = `${c.interview!.tanggal.replace(/-/g, '')}T${c.interview!.jam.replace('.', '')}0000`
              const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Interview ${c.posisi} - PT Primaplast\nDTSTART:${dtstart}\nDURATION:PT1H\nLOCATION:${c.interview!.lokasi}\nDESCRIPTION:Nomor lamaran ${c.id}\nEND:VEVENT\nEND:VCALENDAR`
              const blob = new Blob([ics], { type: 'text/calendar' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `interview-${c.id}.ics`; a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="size-4" />Tambah ke Kalender (.ics)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Offer section */}
      {c.stage === 'Penawaran' && offer && (
        <OfferSection offer={offer} offerEff={offerEff!} candName={c.nama}
          onAccept={() => setOfferConfirm(true)}
          onDecline={() => setDeclineDialog(true)}
          onQuestion={() => setQuestionDialog(true)}
        />
      )}

      {/* Re-upload dialog */}
      <Dialog open={!!reuploadKey} onOpenChange={(o) => !o && setReuploadKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unggah Ulang Dokumen</DialogTitle>
            <DialogDescription>{reuploadKey ? DOC_DEFS.find((d) => d.key === reuploadKey)?.label : ''}</DialogDescription>
          </DialogHeader>
          <FilePicker id="reupload-file" size="touch" {...DOC_ACCEPT} value={reuploadFile} onChange={setReuploadFile} />
          <DialogFooter>
            <Button variant="outline" className="h-12" onClick={() => setReuploadKey(null)}>Batal</Button>
            <Button className="h-12" disabled={!reuploadFile} onClick={handleReupload}>Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept offer confirm */}
      <AlertDialog open={offerConfirm} onOpenChange={setOfferConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terima Penawaran?</AlertDialogTitle>
            <AlertDialogDescription>Keputusan ini tidak dapat dibatalkan setelah dikonfirmasi.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex min-h-12 items-start gap-3 px-1 py-2">
            <Checkbox id="oc-check" checked={offerConfirmCheck} onCheckedChange={(v) => setOfferConfirmCheck(!!v)} />
            <label htmlFor="oc-check" className="text-sm">Saya telah membaca surat penawaran dan menyetujui semua syarat dan ketentuan.</label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Batal</AlertDialogCancel>
            <AlertDialogAction className="h-12" disabled={!offerConfirmCheck} onClick={handleAcceptOffer}>Terima Penawaran</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline offer */}
      <Dialog open={declineDialog} onOpenChange={setDeclineDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tolak Penawaran</DialogTitle><DialogDescription>Mohon sampaikan alasan penolakan Anda.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-alasan">Alasan *</Label>
            <Textarea id="decline-alasan" rows={3} value={declineAlasan} onChange={(e) => setDeclineAlasan(e.target.value)} placeholder="Minimal 10 karakter..." />
            {declineAlasan && declineAlasan.trim().length < 10 && <p className="text-sm text-danger">Alasan minimal 10 karakter</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-12" onClick={() => setDeclineDialog(false)}>Batal</Button>
            <Button variant="destructive" className="h-12" disabled={declineAlasan.trim().length < 10} onClick={handleDeclineOffer}>Tolak Penawaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajukan Pertanyaan</DialogTitle><DialogDescription>Pertanyaan akan diteruskan ke tim HR. Status penawaran tetap Dikirim.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="q-text">Pertanyaan *</Label>
            <Textarea id="q-text" rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-12" onClick={() => setQuestionDialog(false)}>Batal</Button>
            <Button className="h-12" disabled={!questionText.trim()} onClick={() => { toast.success('Pertanyaan Anda telah dikirim ke tim HR.'); setQuestionDialog(false); setQuestionText('') }}>Kirim Pertanyaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ───────────────────────── Offer Section ───────────────────────── */
type OfferProps = { offer: Offer; offerEff: ReturnType<typeof effOfferStatus>; candName: string; onAccept: () => void; onDecline: () => void; onQuestion: () => void }
function OfferSection({ offer, offerEff, candName, onAccept, onDecline, onQuestion }: OfferProps) {
  const [letterOpen, setLetterOpen] = useState(false)
  const isPending = offerEff === 'Menunggu Approval' || offerEff === 'Draft' || offerEff === 'Disetujui'
  const isSent = offerEff === 'Dikirim'
  const isAccepted = offerEff === 'Diterima kandidat'
  const isDeclined = offerEff === 'Ditolak kandidat' || offerEff === 'Kedaluwarsa'
  const countdown = offer.dikirim ? `Batas jawaban ${formatDate(offer.dikirim.batas)}, 23.59 WIB` : ''
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader><CardTitle>Penawaran Kerja</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isPending && <Alert><Info className="size-4" /><AlertDescription>Penawaran sedang disiapkan oleh tim HR.</AlertDescription></Alert>}
        {isAccepted && <Alert><CheckCircle2 className="size-4 text-success" /><AlertDescription className="text-success">Anda telah menerima penawaran ini. Selamat bergabung!</AlertDescription></Alert>}
        {isDeclined && <Alert variant="destructive"><AlertDescription>Penawaran ini {offerEff === 'Kedaluwarsa' ? 'telah kedaluwarsa' : 'telah ditolak'}.</AlertDescription></Alert>}
        {isSent && (
          <>
            {countdown && <div className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning"><Clock className="size-4" />{countdown}</div>}
            <dl className="space-y-2 text-sm">
              <Row label="Posisi" value={offer.posisi} />
              <Row label="Tanggal mulai kerja" value={formatDate(offer.tanggalMulai)} />
              {offer.statusKerja === 'Kontrak' && offer.durasi > 0 && <Row label="Masa kontrak" value={`${offer.durasi} bulan`} />}
              <Row label="Gaji pokok" value={rp(offer.gajiPokok)} />
              {offer.tunjangan > 0 && <Row label="Tunjangan jabatan" value={rp(offer.tunjangan)} />}
              {offer.makan > 0 && <Row label="Uang makan" value={rp(offer.makan)} />}
              {offer.transport > 0 && <Row label="Uang transport" value={rp(offer.transport)} />}
              <Row label="Benefit lain" value={offer.benefit} />
            </dl>
            <Button variant="outline" className="h-12 gap-2 w-full" onClick={() => setLetterOpen(true)}><FileText className="size-4" />Lihat Surat Penawaran</Button>
            <div className="flex gap-3">
              <Button className="h-12 flex-1" onClick={onAccept}>Terima Penawaran</Button>
              <Button variant="destructive" className="h-12 flex-1" onClick={onDecline}>Tolak</Button>
            </div>
            <Button variant="ghost" className="h-12 w-full gap-2" onClick={onQuestion}><Info className="size-4" />Ajukan Pertanyaan</Button>
          </>
        )}
      </CardContent>
      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Surat Penawaran {offer.olNo}</DialogTitle></DialogHeader>
          <div className="space-y-3 rounded-md border p-4 text-sm leading-relaxed">
            <p className="font-semibold">PT PRIMAPLAST INDONESIA</p>
            <p>Nomor: {offer.olNo}</p>
            <p>Kepada Yth. <span className="font-medium">{candName}</span></p>
            <p>Dengan hormat, kami dengan senang hati menawarkan posisi <strong>{offer.posisi}</strong> kepada Anda dengan ketentuan:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Tanggal mulai: {formatDate(offer.tanggalMulai)}</li>
              {offer.statusKerja === 'Kontrak' && <li>Status: Kontrak {offer.durasi} bulan</li>}
              <li>Gaji pokok: Rp {offer.gajiPokok.toLocaleString('id-ID')}</li>
              <li>{offer.benefit}</li>
            </ul>
            <p className="text-muted-foreground text-xs">Penawaran ini berlaku hingga {offer.dikirim ? formatDate(offer.dikirim.batas) : '—'}.</p>
          </div>
          <DialogFooter><Button className="h-12" onClick={() => setLetterOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ───────────────────────── Tes List ───────────────────────── */
function TesList({ session, go }: { session: PortalSession; go: (n: PortalNav) => void }) {
  if (!session) return null
  const account = PORTAL_ACCOUNTS.find((a) => a.id === session.accountId)
  const candIds = account?.candidateIds ?? []
  const assigns: TestAssign[] = candIds.flatMap((id) => assignsOf(id))

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Tes Saya</h1><p className="text-sm text-muted-foreground">Undangan tes yang telah dikirimkan kepada Anda</p></div>
      {assigns.length === 0 ? (
        <div className="py-12 text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Belum ada undangan tes.</p></div>
      ) : (
        <div className="space-y-3">
          {assigns.map((a) => {
            const paket = paketOf(a.paketId)
            const eff = effTestStatus(a)
            const variant = eff === 'Selesai' ? 'success' : eff === 'Kedaluwarsa' ? 'neutral' : eff === 'Sedang dikerjakan' ? 'warning' : 'info'
            const statusLabel = eff === 'Dijadwalkan' ? 'Belum dikerjakan' : eff === 'Sedang dikerjakan' ? 'Sedang dikerjakan' : eff === 'Selesai' ? 'Selesai' : 'Kedaluwarsa'
            const isOnline = paket?.jenis === 'online'
            const canStart = eff === 'Dijadwalkan' || eff === 'Sedang dikerjakan'
            const saved = eff === 'Sedang dikerjakan' ? loadExamSession(a.id) : null
            return (
              <Card key={a.id} className="rounded-xl shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{paket?.nama}</span>
                    <StatusBadge variant={variant}>{statusLabel}</StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>Batas: {formatDate(a.batas)}, 23.59 WIB</span>
                    {paket?.durasi ? <span>Durasi: {paket.durasi} menit</span> : <span>Offline / Eksternal</span>}
                    {isOnline && paket.soal.length > 0 && <span>Jumlah soal: {paket.soal.length}</span>}
                  </div>
                  {!isOnline && a.jadwal && <p className="text-sm text-muted-foreground">Jadwal: {formatDate(a.jadwal)}{a.tautan && ` · ${a.tautan}`}</p>}
                  {isOnline && canStart && (
                    <PreTestRules paket={paket!} saved={!!saved} onStart={() => go({ id: 'ujian', assignId: a.id })} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PreTestRules({ paket, saved, onStart }: { paket: ReturnType<typeof paketOf>; saved: boolean; onStart: () => void }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  if (!paket) return null
  return (
    <>
      <Button variant="outline" className="h-12 w-full" onClick={() => setOpen(true)}>
        {saved ? 'Lanjutkan Tes' : 'Mulai Tes'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Peraturan Tes</DialogTitle><DialogDescription>{paket.nama}</DialogDescription></DialogHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="mt-0.5 text-muted-foreground">•</span>Durasi: <strong>{paket.durasi} menit</strong></li>
            <li className="flex gap-2"><span className="mt-0.5 text-muted-foreground">•</span>Jumlah soal: <strong>{paket.soal.length} soal</strong></li>
            <li className="flex gap-2"><span className="mt-0.5 text-muted-foreground">•</span>Jawaban tersimpan otomatis setiap kali Anda memilih opsi</li>
            <li className="flex gap-2"><span className="mt-0.5 text-muted-foreground">•</span>Waktu tetap berjalan bila Anda keluar dari halaman</li>
            <li className="flex gap-2"><span className="mt-0.5 text-muted-foreground">•</span>Keluar halaman akan tercatat dan dilaporkan ke HRD</li>
          </ul>
          <div className="flex min-h-12 items-center gap-3 rounded-md border p-3">
            <Checkbox id="pre-ready" checked={ready} onCheckedChange={(v) => setReady(!!v)} />
            <label htmlFor="pre-ready" className="text-sm font-medium">Saya siap memulai tes</label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-12" onClick={() => setOpen(false)}>Kembali</Button>
            <Button className="h-12" disabled={!ready} onClick={() => { setOpen(false); onStart() }}>Mulai Tes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ───────────────────────── Akun ───────────────────────── */
function AkunPage({ session, go, onLogout }: { session: PortalSession; go: (n: PortalNav) => void; onLogout: () => void }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  if (!session) return null
  const account = PORTAL_ACCOUNTS.find((a) => a.id === session.accountId)
  const hasDeleteReq = !!account?.deleteRequest
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Akun Saya</h1></div>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12"><AvatarFallback className="bg-muted text-sm font-semibold">{initials(session.nama)}</AvatarFallback></Avatar>
            <div><p className="font-semibold">{session.nama}</p><p className="text-sm text-muted-foreground">{session.email}</p><p className="text-sm text-muted-foreground">{formatHp(session.phone)}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="divide-y p-0">
          <button className="flex h-12 w-full items-center gap-3 px-4 text-sm hover:bg-accent" onClick={() => toast.info('Ubah kata sandi: fitur ini akan dikirim melalui email (demo)')}>
            <Shield className="size-4 text-muted-foreground" />Ubah Kata Sandi
          </button>
          <button className="flex h-12 w-full items-center gap-3 px-4 text-sm hover:bg-accent" onClick={() => toast.info('Kebijakan Privasi: data pelamar diproses sesuai UU PDP No. 27/2022')}>
            <FileText className="size-4 text-muted-foreground" />Kebijakan Privasi
          </button>
          <button
            className={cn('flex h-12 w-full items-center gap-3 px-4 text-sm hover:bg-accent', hasDeleteReq ? 'text-muted-foreground' : 'text-danger')}
            onClick={() => !hasDeleteReq && setDeleteConfirm(true)}
            disabled={hasDeleteReq}
          >
            <Trash2 className="size-4" />{hasDeleteReq ? 'Permintaan hapus data sedang diproses' : 'Ajukan Penghapusan Data'}
          </button>
          <button className="flex h-12 w-full items-center gap-3 px-4 text-sm text-danger hover:bg-accent" onClick={onLogout}>
            <LogOut className="size-4" />Keluar
          </button>
        </CardContent>
      </Card>
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajukan Penghapusan Data?</AlertDialogTitle>
            <AlertDialogDescription>Permintaan akan diteruskan ke tim HR dan diproses sesuai UU PDP No. 27/2022. Data lamaran yang sudah masuk tahap Interview atau lebih lanjut tidak dapat langsung dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => {
              if (account) {
                const candIds = account.candidateIds
                for (const id of candIds) portalRequestDelete(id)
                requestDeletion(account.id)
              }
              setDeleteConfirm(false)
              toast.success('Permintaan penghapusan data telah dikirim ke HRD.')
            }}>Ajukan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ───────────────────────── Utilities ───────────────────────── */
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}
function Err({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="text-sm text-danger">{children}</p>
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>
}
function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

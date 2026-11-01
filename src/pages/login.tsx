import { Check, Eye, EyeOff, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { Toaster } from '@/components/ui/sonner'
import {
  DEMO_ACCOUNT_NIPS, DEMO_PASSWORD, accountOf, attemptLogin, checkPassword, consumeReset, issueOtp, maskEmail, needsOtp, otpSentAt,
  passwordOk, requestReset, resetAccount, rolesOf, setPassword, verifyOtp, type Account,
} from '@/data/accounts'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { ROLE_LABEL } from '@/data/users'
import { startSession, takeEndNotice } from '@/lib/session'
import { ChevronsUpDown } from 'lucide-react'

type View =
  | { name: 'masuk' }
  | { name: 'otp'; account: Account; mustChange: boolean }
  | { name: 'lupa' }
  | { name: 'baru'; account: Account; kind: 'login' | 'reset'; token?: string }

const TITLE = 'Masuk · KOMPETEN HRIS & Koperasi'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="pt-6 text-center text-xs text-muted-foreground">© 2026 PT Primaplast Indonesia</p>
      </div>
      <div className="relative hidden flex-col items-center justify-center gap-6 bg-muted p-10 text-center lg:flex">
        <img src="/assets/logo-mark.svg" alt="" aria-hidden className="size-40 object-contain dark:hidden" />
        <img src="/assets/logo-mark-white.svg" alt="" aria-hidden className="hidden size-40 object-contain dark:block" />
        <p className="max-w-sm text-lg font-medium leading-snug">Satu tempat untuk rekrutmen, kepegawaian, kehadiran, payroll, pengembangan, dan koperasi PT Primaplast Indonesia.</p>
      </div>
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="text-sm text-danger">{children}</p>
}

export default function LoginPage({ onOpenPortal }: { onOpenPortal: () => void }) {
  const [view, setView] = useState<View>({ name: 'masuk' })
  const [notice, setNotice] = useState<'idle' | 'logout' | 'dibuat' | 'otp-habis' | 'mobile-reset' | null>(() => (takeEndNotice() === 'idle' ? 'idle' : null))
  useEffect(() => { document.title = TITLE }, [view])

  const finish = (a: Account) => startSession(a)
  /** Setelah kredensial (dan kata sandi baru bila perlu) beres: OTP bila perannya wajib, selain itu langsung masuk. */
  const proceed = (a: Account) => {
    const roles = rolesOf(a)
    if (roles.length === 0) { setNotice('mobile-reset'); setView({ name: 'masuk' }); return }
    if (needsOtp(roles)) { const code = issueOtp(a); toast.info(`(simulasi) Kode OTP: ${code}`, { duration: 15000 }); setView({ name: 'otp', account: a, mustChange: false }); return }
    finish(a)
  }

  return (
    <>
      <Toaster />
      <Shell>
        {view.name === 'masuk' && (
          <MasukForm
            notice={notice}
            onOpenPortal={onOpenPortal}
            onForgot={() => { setNotice(null); setView({ name: 'lupa' }) }}
            onSuccess={(a, otp, mustChange) => {
              setNotice(null)
              if (otp) { const code = issueOtp(a); toast.info(`(simulasi) Kode OTP: ${code}`, { duration: 15000 }); setView({ name: 'otp', account: a, mustChange }) }
              else if (mustChange) setView({ name: 'baru', account: a, kind: 'login' })
              else finish(a)
            }}
          />
        )}
        {view.name === 'otp' && (
          <OtpForm
            account={view.account}
            onBack={(habis) => { setNotice(habis ? 'otp-habis' : null); setView({ name: 'masuk' }) }}
            onVerified={() => (view.mustChange ? setView({ name: 'baru', account: view.account, kind: 'login' }) : finish(view.account))}
          />
        )}
        {view.name === 'lupa' && <LupaForm onBack={() => setView({ name: 'masuk' })} onOpenLink={(a, token) => setView({ name: 'baru', account: a, kind: 'reset', token })} />}
        {view.name === 'baru' && (
          <BaruForm
            account={view.account}
            kind={view.kind}
            onDone={() => {
              if (view.token) consumeReset(view.token)
              if (view.kind === 'reset') { toast.success('Kata sandi diperbarui'); proceed(view.account) }
              else if (rolesOf(view.account).length === 0) { setNotice('mobile-reset'); setView({ name: 'masuk' }) }
              else finish(view.account)
            }}
          />
        )}
      </Shell>
    </>
  )
}

function MasukForm({ notice, onOpenPortal, onForgot, onSuccess }: {
  notice: string | null
  onOpenPortal: () => void
  onForgot: () => void
  onSuccess: (a: Account, otp: boolean, mustChange: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<{ kind: 'salah' | 'terkunci' | 'nonaktif' | 'mobile' | 'kosong'; message: string } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !pw) { setErr({ kind: 'kosong', message: !email.trim() ? 'Email kantor wajib diisi' : 'Kata sandi wajib diisi' }); return }
    const r = attemptLogin(email, pw)
    if (!r.ok) { setErr({ kind: r.kind, message: r.message }); return }
    setErr(null)
    onSuccess(r.account, r.otp, r.mustChange)
  }
  const invalid = err?.kind === 'salah' || err?.kind === 'kosong'
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Logo />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Masuk ke KOMPETEN</h1>
          <p className="text-sm text-muted-foreground">Gunakan email kantor Anda</p>
        </div>
      </div>
      {notice === 'idle' && <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Sesi berakhir karena tidak aktif. Silakan masuk kembali.</AlertDescription></Alert>}
      {notice === 'otp-habis' && <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Kode OTP salah 3 kali. Silakan masuk kembali.</AlertDescription></Alert>}
      {notice === 'mobile-reset' && <Alert variant="info"><Info aria-hidden /><AlertDescription>Kata sandi diperbarui. Akun Anda untuk aplikasi KOMPETEN Mobile.</AlertDescription></Alert>}
      {err?.kind === 'mobile' && <Alert variant="info"><Info aria-hidden /><AlertDescription>{err.message}</AlertDescription></Alert>}
      {err && err.kind !== 'mobile' && <Alert variant="destructive" role="alert"><TriangleAlert aria-hidden /><AlertDescription>{err.message}</AlertDescription></Alert>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="lg-email">Email kantor</Label>
          <Input id="lg-email" type="email" autoComplete="username" value={email} placeholder={`nama@${SECURITY_POLICY.domain}`} aria-invalid={invalid || undefined} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lg-pw">Kata sandi</Label>
          <div className="relative">
            <Input id="lg-pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} className="pr-10" aria-invalid={invalid || undefined} onChange={(e) => setPw(e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>
        <div className="-mt-2 flex justify-end">
          <button type="button" onClick={onForgot} className="rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Lupa kata sandi?</button>
        </div>
        <Button ref={btn} type="submit" className="w-full">Masuk</Button>
      </form>
      <DemoAccounts onPick={(a) => { setEmail(a.emailKantor); setPw(DEMO_PASSWORD); setErr(null); setTimeout(() => btn.current?.focus(), 0) }} />
      <p className="text-center text-sm text-muted-foreground">
        Melamar kerja?{' '}
        <button type="button" onClick={onOpenPortal} className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Buka Portal Karier</button>
      </p>
    </div>
  )
}

function DemoAccounts({ onPick }: { onPick: (a: Account) => void }) {
  const items = DEMO_ACCOUNT_NIPS.map((nip) => accountOf(nip)).filter((a): a is Account => !!a)
  return (
    <Collapsible className="rounded-md border">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-2 rounded-md p-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span>Akun demo <span className="font-normal text-muted-foreground">(demo — dihapus di produksi)</span></span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 border-t p-3">
          <p className="text-xs text-muted-foreground">Kata sandi semua akun demo: <span className="font-medium tabular-nums text-foreground">{DEMO_PASSWORD}</span></p>
          <ul className="grid gap-2">
            {items.map((a) => {
              const roles = rolesOf(a)
              const label = a.status === 'Nonaktif' ? 'Nonaktif (pegawai keluar)' : roles.length === 0 ? 'Karyawan (hanya Mobile)' : roles.map((r) => ROLE_LABEL[r]).join(' + ')
              return (
                <li key={a.nip}>
                  <button type="button" onClick={() => onPick(a)} className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">{label}{a.wajibGantiSandi ? ' · wajib ganti sandi' : ''}</span>
                    </span>
                    {needsOtp(roles) && <StatusBadge variant="info">OTP</StatusBadge>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function OtpForm({ account, onBack, onVerified }: { account: Account; onBack: (habis: boolean) => void; onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const wait = Math.max(0, Math.ceil((otpSentAt(account) + SECURITY_POLICY.otpResendSeconds * 1000 - now) / 1000))
  const check = (c: string) => {
    if (c.length < 6) { setErr('Masukkan 6 digit kode'); return }
    const r = verifyOtp(account, c)
    if (r === 'ok') return onVerified()
    if (r === 'habis') return onBack(true)
    setCode('')
    setErr(r === 'kedaluwarsa' ? 'Kode kedaluwarsa. Kirim ulang kode.' : 'Kode salah. Periksa kembali kode di email Anda.')
  }
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verifikasi kode</h1>
        <p className="text-sm text-muted-foreground">Kode dikirim ke {maskEmail(account.emailKantor)}. Berlaku {SECURITY_POLICY.otpMinutes} menit.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); check(code) }} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="lg-otp">Kode OTP 6 digit</Label>
          <InputOTP id="lg-otp" maxLength={6} value={code} autoFocus inputMode="numeric" aria-invalid={!!err || undefined} onChange={(v) => { setCode(v.replace(/\D/g, '')); setErr('') }} onComplete={check} containerClassName="justify-between">
            <InputOTPGroup className="w-full justify-between">
              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} aria-invalid={!!err || undefined} />)}
            </InputOTPGroup>
          </InputOTP>
          {err && <FieldError id="lg-otp-err">{err}</FieldError>}
        </div>
        <Button type="submit" className="w-full">Verifikasi</Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={() => onBack(false)} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Kembali</button>
        <button
          type="button"
          disabled={wait > 0}
          onClick={() => { const c = issueOtp(account); toast.info(`(simulasi) Kode OTP: ${c}`, { duration: 15000 }); setCode(''); setErr(''); setNow(Date.now()) }}
          className="rounded-sm underline-offset-4 enabled:hover:underline disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {wait > 0 ? `Kirim ulang dalam ${wait} detik` : 'Kirim ulang kode'}
        </button>
      </div>
    </div>
  )
}

function LupaForm({ onBack, onOpenLink }: { onBack: () => void; onOpenLink: (a: Account, token: string) => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<{ token: string | null } | null>(null)
  const [err, setErr] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { setErr('Masukkan email kantor yang valid'); return }
    setErr('')
    setSent({ token: requestReset(email) })
  }
  const target = sent?.token ? resetAccount(sent.token) : undefined
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Lupa kata sandi</h1>
        <p className="text-sm text-muted-foreground">Masukkan email kantor Anda untuk menerima tautan reset.</p>
      </div>
      {sent && (
        <>
          <Alert variant="info" role="status"><Info aria-hidden /><AlertDescription>Jika email terdaftar, tautan reset telah dikirim (berlaku {SECURITY_POLICY.resetMinutes} menit).</AlertDescription></Alert>
          {target && sent.token && <Button type="button" variant="outline" className="w-full" onClick={() => onOpenLink(target, sent.token!)}>(simulasi) Buka tautan reset</Button>}
        </>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="lg-lupa">Email kantor</Label>
          <Input id="lg-lupa" type="email" autoComplete="username" value={email} aria-invalid={!!err || undefined} onChange={(e) => { setEmail(e.target.value); setErr('') }} />
          {err && <FieldError id="lg-lupa-err">{err}</FieldError>}
        </div>
        <Button type="submit" className="w-full">Kirim tautan reset</Button>
      </form>
      <button type="button" onClick={onBack} className="block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Kembali ke halaman Masuk</button>
    </div>
  )
}

function BaruForm({ account, kind, onDone }: { account: Account; kind: 'login' | 'reset'; onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [sub, setSub] = useState(false)
  const [show, setShow] = useState(false)
  const c = checkPassword(pw, account.kataSandi)
  const same = pw === pw2 && pw2.length > 0
  const items: [boolean, string][] = [
    [c.len, `Minimal ${SECURITY_POLICY.minPassword} karakter`],
    [c.huruf, 'Mengandung huruf'],
    [c.angka, 'Mengandung angka'],
    [c.beda, 'Tidak sama dengan kata sandi lama'],
  ]
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSub(true)
    if (!passwordOk(c) || !same) return
    setPassword(account, pw, kind === 'reset' ? 'reset' : 'ganti')
    onDone()
  }
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Atur kata sandi baru</h1>
        <p className="text-sm text-muted-foreground">{kind === 'login' ? 'Ini login pertama Anda atau kata sandi baru direset. Buat kata sandi baru untuk melanjutkan.' : `Buat kata sandi baru untuk ${account.emailKantor}.`}</p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="lg-new">Kata sandi baru</Label>
          <div className="relative">
            <Input id="lg-new" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} className="pr-10" aria-invalid={(sub && !passwordOk(c)) || undefined} aria-describedby="lg-checklist" onChange={(e) => setPw(e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>
        <ul id="lg-checklist" className="space-y-1 text-sm" aria-label="Syarat kata sandi">
          {items.map(([ok, label]) => {
            const bad = !ok && (pw.length > 0 || sub)
            return (
              <li key={label} className={`flex items-center gap-2 ${ok ? 'text-success' : bad ? 'text-danger' : 'text-muted-foreground'}`}>
                {ok ? <Check className="size-4" aria-hidden /> : bad ? <X className="size-4" aria-hidden /> : <span className="size-4 text-center" aria-hidden>•</span>}
                <span>{label}</span><span className="sr-only">{ok ? ' (terpenuhi)' : ' (belum terpenuhi)'}</span>
              </li>
            )
          })}
        </ul>
        <div className="space-y-2">
          <Label htmlFor="lg-new2">Ulangi kata sandi baru</Label>
          <Input id="lg-new2" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} aria-invalid={(sub && !same) || undefined} onChange={(e) => setPw2(e.target.value)} />
          {sub && !same && <FieldError id="lg-new2-err">Kata sandi tidak sama</FieldError>}
        </div>
        {sub && !passwordOk(c) && <FieldError id="lg-new-err">Kata sandi belum memenuhi semua syarat di atas</FieldError>}
        <Button type="submit" className="w-full">Simpan dan lanjutkan</Button>
      </form>
    </div>
  )
}


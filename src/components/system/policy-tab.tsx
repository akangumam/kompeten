import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { applyPolicy, ASSIGNABLE, type Account } from '@/data/accounts'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { ROLE_LABEL, type Role } from '@/data/users'

type Form = { domain: string; minPassword: string; maxFailed: string; lockMinutes: string; idleMinutes: string; idleWarnMinutes: string; otpRoles: Role[] }
const fromPolicy = (): Form => ({
  domain: SECURITY_POLICY.domain, minPassword: String(SECURITY_POLICY.minPassword), maxFailed: String(SECURITY_POLICY.maxFailed), lockMinutes: String(SECURITY_POLICY.lockMinutes),
  idleMinutes: String(SECURITY_POLICY.idleMinutes), idleWarnMinutes: String(SECURITY_POLICY.idleWarnMinutes), otpRoles: [...SECURITY_POLICY.otpRoles],
})
const range = (v: string, lo: number, hi: number, label: string) => {
  const n = Number(v)
  return v.trim() === '' || !Number.isInteger(n) || n < lo || n > hi ? `${label} harus bilangan bulat ${lo}–${hi}` : ''
}

/** Master Kebijakan Keamanan (Super Admin): berlaku segera dan tercatat di audit dengan nilai lama → baru. */
export function PolicyTab({ admin }: { admin: Account }) {
  const [f, setF] = useState<Form>(fromPolicy)
  const [sub, setSub] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const errs = {
    domain: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(f.domain.trim()) ? '' : 'Domain tidak valid, contoh primaplast.co.id',
    minPassword: range(f.minPassword, 8, 32, 'Panjang minimal'),
    maxFailed: range(f.maxFailed, 3, 10, 'Gagal maksimal'),
    lockMinutes: range(f.lockMinutes, 5, 60, 'Lama terkunci'),
    idleMinutes: range(f.idleMinutes, 10, 120, 'Idle'),
    idleWarnMinutes: range(f.idleWarnMinutes, 1, 5, 'Peringatan') || (Number(f.idleWarnMinutes) >= Number(f.idleMinutes) ? 'Peringatan harus lebih kecil dari idle' : ''),
  }
  const bad = Object.values(errs).some(Boolean)
  const show = (k: keyof typeof errs) => (sub ? errs[k] : '') || undefined
  const domainChanged = f.domain.trim().toLowerCase() !== SECURITY_POLICY.domain
  const num = (k: 'minPassword' | 'maxFailed' | 'lockMinutes' | 'idleMinutes' | 'idleWarnMinutes', label: string, helper: string, unit?: string) => (
    <Field id={`pol-${k}`} label={label} required error={show(k)} helper={helper}>
      <div className="flex items-center gap-2">
        <Input id={`pol-${k}`} inputMode="numeric" className="w-28 text-right tabular-nums" value={f[k]} aria-invalid={!!show(k) || undefined} onChange={(e) => set(k, e.target.value.replace(/\D/g, ''))} />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </Field>
  )
  const save = () => {
    setSub(true)
    if (bad) return
    const n = applyPolicy({
      domain: f.domain.trim().toLowerCase(), minPassword: Number(f.minPassword), maxFailed: Number(f.maxFailed), lockMinutes: Number(f.lockMinutes),
      idleMinutes: Number(f.idleMinutes), idleWarnMinutes: Number(f.idleWarnMinutes), otpRoles: [...new Set<Role>([...f.otpRoles, 'superadmin'])],
    }, admin)
    toast.success(n ? 'Kebijakan keamanan disimpan dan berlaku segera' : 'Tidak ada perubahan')
    setSub(false); setF(fromPolicy())
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kebijakan keamanan</CardTitle>
        <CardDescription>Berlaku segera setelah disimpan dan tercatat di Audit Log.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Field id="pol-domain" label="Domain email perusahaan" required error={show('domain')} helper="Dipakai untuk email kantor semua pegawai">
              <Input id="pol-domain" value={f.domain} className="max-w-sm" aria-invalid={!!show('domain') || undefined} onChange={(e) => set('domain', e.target.value)} />
            </Field>
            {domainChanged && !errs.domain && <Alert variant="warning"><TriangleAlert aria-hidden /><AlertDescription>Email yang sudah ada tidak diubah otomatis.</AlertDescription></Alert>}
          </div>
          {num('minPassword', 'Panjang minimal kata sandi', 'Rentang 8–32 karakter', 'karakter')}
          {num('maxFailed', 'Gagal maksimal sebelum terkunci', 'Rentang 3–10 kali', 'kali')}
          {num('lockMinutes', 'Lama terkunci', 'Rentang 5–60 menit', 'menit')}
          {num('idleMinutes', 'Sesi idle', 'Rentang 10–120 menit', 'menit')}
          {num('idleWarnMinutes', 'Peringatan sebelum sesi habis', 'Rentang 1–5 menit dan lebih kecil dari idle', 'menit')}
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Peran wajib OTP</legend>
          <p className="text-xs text-muted-foreground">Super Admin selalu wajib OTP dan tidak dapat dilepas.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ASSIGNABLE.map((r) => {
              const locked = r === 'superadmin'
              const on = locked || f.otpRoles.includes(r)
              return (
                <label key={r} className="flex min-h-10 items-center gap-3 rounded-md border p-2 text-sm">
                  <Checkbox checked={on} disabled={locked} aria-label={ROLE_LABEL[r]} onCheckedChange={(c) => set('otpRoles', c ? [...f.otpRoles, r] : f.otpRoles.filter((x) => x !== r))} />
                  <span className="flex-1">{ROLE_LABEL[r]}</span>
                  {locked && <StatusBadge variant="info">Wajib</StatusBadge>}
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => { setF(fromPolicy()); setSub(false) }}>Batalkan perubahan</Button>
          <Button onClick={save}>Simpan kebijakan</Button>
        </div>
      </CardContent>
    </Card>
  )
}

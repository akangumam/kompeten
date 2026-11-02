import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { changeRoles, isKsb, validateRoles, KSB_ROLES, type Account, type KsbRole, type Masa } from '@/data/accounts'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { ROLE_LABEL, type Role } from '@/data/users'

const GROUPS: { label: string; roles: Role[] }[] = [
  { label: 'HR', roles: ['hr_recruitment', 'hr_personalia', 'hr_development'] },
  { label: 'Manajemen', roles: ['manager', 'direksi'] },
  { label: 'Keuangan', roles: ['payroll', 'finance'] },
  { label: 'Koperasi', roles: ['sekretaris', 'bendahara', 'ketua'] },
  { label: 'IT', roles: ['superadmin'] },
]

/** Kelola peran akun (Super Admin). Atasan dan Karyawan otomatis dari struktur organisasi. */
export function RoleSheet({ target, admin, onClose, onSaved }: { target: Account | null; admin: Account; onClose: () => void; onSaved: () => void }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [masa, setMasa] = useState<Partial<Record<KsbRole, Masa>>>({})
  useEffect(() => {
    if (!target) return
    setRoles([...target.peran])
    setMasa({ ...(target.masaJabatan ?? {}) })
  }, [target])
  const v = useMemo(() => (target ? validateRoles(target, { roles, masa }, admin) : { ksb: {} as Partial<Record<KsbRole, string>>, error: undefined }), [target, roles, masa, admin])
  const toggle = (r: Role, on: boolean) => {
    setRoles((cur) => (on ? [...cur, r] : cur.filter((x) => x !== r)))
    if (on && isKsb(r)) setMasa((m) => ({ ...m, [r]: m[r] ?? { mulai: '2026-01-01', selesai: '2026-12-31' } }))
  }
  const self = !!target && target.nip === admin.nip
  const blocked = !!v.error || Object.keys(v.ksb).length > 0
  const save = () => {
    if (!target) return
    const r = changeRoles(target, { roles, masa }, admin)
    if (r.error) { toast.error(r.error); return }
    toast.success(`Peran ${target.nama} diperbarui. Berlaku pada login atau ganti peran berikutnya.`)
    onSaved(); onClose()
  }
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-[560px]">
        <SheetHeader className="border-b">
          <SheetTitle>Kelola peran</SheetTitle>
          <SheetDescription>{target?.nama} · {target?.emailKantor}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 p-4">
          {v.error && <Alert variant="warning"><Info aria-hidden /><AlertDescription>{v.error}</AlertDescription></Alert>}
          {GROUPS.map((g) => (
            <fieldset key={g.label} className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</legend>
              {g.roles.map((r) => {
                const on = roles.includes(r)
                const err = isKsb(r) ? v.ksb[r] : undefined
                return (
                  <div key={r} className="space-y-2 rounded-md border p-3">
                    <label className="flex min-h-8 cursor-pointer items-center gap-3 text-sm font-medium">
                      <Checkbox checked={on} onCheckedChange={(c) => toggle(r, !!c)} disabled={self} aria-label={ROLE_LABEL[r]} />
                      <span className="flex-1">{ROLE_LABEL[r]}</span>
                      {SECURITY_POLICY.otpRoles.includes(r) && <StatusBadge variant="info">OTP</StatusBadge>}
                    </label>
                    {on && isKsb(r) && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label htmlFor={`ms-${r}`} className="text-xs text-muted-foreground">Masa jabatan mulai</label>
                          <DatePicker id={`ms-${r}`} value={masa[r]?.mulai ?? ''} invalid={!!err} onChange={(d) => setMasa((m) => ({ ...m, [r]: { mulai: d, selesai: m[r]?.selesai ?? '' } }))} />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`me-${r}`} className="text-xs text-muted-foreground">Masa jabatan selesai</label>
                          <DatePicker id={`me-${r}`} value={masa[r]?.selesai ?? ''} invalid={!!err} onChange={(d) => setMasa((m) => ({ ...m, [r]: { mulai: m[r]?.mulai ?? '', selesai: d } }))} />
                        </div>
                        {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </fieldset>
          ))}
          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Atasan</span> · otomatis dari struktur organisasi (punya bawahan langsung).</p>
            <p><span className="font-medium text-foreground">Karyawan</span> · otomatis untuk pegawai aktif (aplikasi Mobile).</p>
          </div>
        </div>
        <SheetFooter className="sticky bottom-0 mt-auto flex-row justify-end gap-3 border-t bg-background p-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          {self ? (
            <Tooltip>
              <TooltipTrigger asChild><span tabIndex={0}><Button disabled>Simpan</Button></span></TooltipTrigger>
              <TooltipContent>Peran Anda sendiri harus diubah Super Admin lain</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={save} disabled={blocked}>Simpan</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
export { KSB_ROLES }

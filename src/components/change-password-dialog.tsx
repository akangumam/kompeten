import { Check, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { checkPassword, passwordOk, setPassword, type Account } from '@/data/accounts'
import { SECURITY_POLICY } from '@/data/master/security-policy'

/** Ganti kata sandi dari menu akun (kata sandi lama wajib). Simulasi: backend memverifikasi hash. */
export function ChangePasswordDialog({ account, open, onClose }: { account: Account; open: boolean; onClose: () => void }) {
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [sub, setSub] = useState(false)
  const c = checkPassword(pw, account.kataSandi)
  const curBad = sub && cur !== account.kataSandi
  const same = pw === pw2 && pw2.length > 0
  const close = () => { setCur(''); setPw(''); setPw2(''); setSub(false); onClose() }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSub(true)
    if (cur !== account.kataSandi || !passwordOk(c) || !same) return
    setPassword(account, pw, 'ganti')
    toast.success('Kata sandi diganti')
    close()
  }
  const items: [boolean, string][] = [
    [c.len, `Minimal ${SECURITY_POLICY.minPassword} karakter`],
    [c.huruf, 'Mengandung huruf'],
    [c.angka, 'Mengandung angka'],
    [c.beda, 'Tidak sama dengan kata sandi lama'],
  ]
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ganti kata sandi</DialogTitle>
          <DialogDescription>{account.emailKantor}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="cp-cur">Kata sandi saat ini</Label>
            <Input id="cp-cur" type="password" autoComplete="current-password" value={cur} aria-invalid={curBad || undefined} onChange={(e) => setCur(e.target.value)} />
            {curBad && <p className="text-sm text-danger">Kata sandi saat ini salah</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-new">Kata sandi baru</Label>
            <Input id="cp-new" type="password" autoComplete="new-password" value={pw} aria-invalid={(sub && !passwordOk(c)) || undefined} onChange={(e) => setPw(e.target.value)} />
          </div>
          <ul className="space-y-1 text-sm" aria-label="Syarat kata sandi">
            {items.map(([ok, label]) => {
              const bad = !ok && (pw.length > 0 || sub)
              return (
                <li key={label} className={`flex items-center gap-2 ${ok ? 'text-success' : bad ? 'text-danger' : 'text-muted-foreground'}`}>
                  {ok ? <Check className="size-4" aria-hidden /> : bad ? <X className="size-4" aria-hidden /> : <span className="size-4 text-center" aria-hidden>•</span>}
                  {label}
                </li>
              )
            })}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="cp-new2">Ulangi kata sandi baru</Label>
            <Input id="cp-new2" type="password" autoComplete="new-password" value={pw2} aria-invalid={(sub && !same) || undefined} onChange={(e) => setPw2(e.target.value)} />
            {sub && !same && <p className="text-sm text-danger">Kata sandi tidak sama</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

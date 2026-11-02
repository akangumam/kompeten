import { KeyRound, Lock, LockOpen, MoreHorizontal, ShieldCheck, ShieldOff, UserCog, UserX, CircleCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePaging, Pager } from '@/components/attendance/pager'
import { PersonCell, StatCard, KPI_GRID } from '@/components/payroll/pay/shared'
import { RoleSheet } from '@/components/system/role-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AlasanField } from '@/components/ui/alasan-field'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ASSIGNABLE, listAccounts, needsOtp, resetPasswordAdmin, restoreAccount, rolesOf, statusOf, suspendAccount, unlockAccount, type Account } from '@/data/accounts'
import { ROSTER } from '@/data/employees'
import { EXITED } from '@/data/profiles'
import { ROLE_LABEL, type Role } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'
const wib = (iso?: string) => (iso ? `${new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false }).replace(/(\d{2}):(\d{2})/, '$1.$2')} WIB` : '—')
const clock = (t?: number) => (t ? new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false }).replace(':', '.') : '')
const deptOf = (a: Account) => ROSTER.find((e) => e.nik === a.nip)?.department ?? EXITED.find((e) => e.nik === a.nip)?.department ?? (a.pegawai === false ? 'Direksi' : '—')

/** Status tampilan tunggal untuk satu akun. */
function statusView(a: Account): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' } {
  const st = statusOf(a)
  if (st === 'Nonaktif') return { label: `Nonaktif sejak ${formatDate(a.nonaktifSejak ?? '')}`, variant: 'neutral' }
  if (st === 'Ditangguhkan') return { label: 'Ditangguhkan', variant: 'danger' }
  if (st === 'Terkunci') return { label: `Terkunci s/d ${clock(a.terkunciSampai)} WIB`, variant: 'warning' }
  if (a.wajibGantiSandi) return { label: 'Wajib ganti sandi', variant: 'info' }
  return { label: 'Aktif', variant: 'success' }
}

export function UsersTab({ admin }: { admin: Account }) {
  const [tick, setTick] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(ALL)
  const [role, setRole] = useState(ALL)
  const [dept, setDept] = useState(ALL)
  const [reset, setReset] = useState<Account | null>(null)
  const [susp, setSusp] = useState<{ acc: Account; mode: 'tangguh' | 'pulih' } | null>(null)
  const [alasan, setAlasan] = useState('')
  const [alasanErr, setAlasanErr] = useState('')
  const [roleFor, setRoleFor] = useState<Account | null>(null)
  const bump = () => setTick((n) => n + 1)

  const all = useMemo(() => [...listAccounts()].sort((a, b) => a.nama.localeCompare(b.nama)), [tick])
  const depts = useMemo(() => [...new Set(all.map(deptOf))].sort(), [all])
  const stats = useMemo(() => {
    const sv = all.map((a) => ({ a, st: statusOf(a) }))
    return {
      aktif: sv.filter((x) => x.st === 'Aktif').length,
      terkunci: sv.filter((x) => x.st === 'Terkunci').length,
      ganti: sv.filter((x) => x.st === 'Aktif' && x.a.wajibGantiSandi).length,
      nonaktif: sv.filter((x) => x.st === 'Nonaktif').length,
    }
  }, [all])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((a) => {
      const st = statusOf(a)
      if (needle && !`${a.nama} ${a.emailKantor} ${a.nip}`.toLowerCase().includes(needle)) return false
      if (status !== ALL && !(status === 'Wajib ganti sandi' ? st === 'Aktif' && a.wajibGantiSandi : st === status)) return false
      if (role !== ALL && !rolesOf(a, true).includes(role as Role)) return false
      if (dept !== ALL && deptOf(a) !== dept) return false
      return true
    })
  }, [all, q, status, role, dept])
  const paging = usePaging(rows, `${q}|${status}|${role}|${dept}`)

  const closeSusp = () => { setSusp(null); setAlasan(''); setAlasanErr('') }
  const doSusp = () => {
    if (!susp) return
    const r = susp.mode === 'tangguh' ? suspendAccount(susp.acc, alasan, admin) : restoreAccount(susp.acc, alasan, admin)
    if (r.error) { setAlasanErr(r.error); return }
    toast.success(susp.mode === 'tangguh' ? `Akses ${susp.acc.nama} ditangguhkan` : `Akses ${susp.acc.nama} dipulihkan`)
    closeSusp(); bump()
  }

  return (
    <div className="space-y-6">
      <div className={KPI_GRID}>
        <StatCard label="Akun aktif" value={stats.aktif.toLocaleString('id-ID')} icon={CircleCheck} hint="Dapat login" />
        <StatCard label="Terkunci" value={stats.terkunci.toLocaleString('id-ID')} icon={Lock} hint="Gagal login berturut-turut" />
        <StatCard label="Wajib ganti sandi" value={stats.ganti.toLocaleString('id-ID')} icon={KeyRound} hint="Login pertama atau setelah reset" />
        <StatCard label="Nonaktif" value={stats.nonaktif.toLocaleString('id-ID')} icon={UserX} hint="Pegawai keluar (offboarding selesai)" />
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input aria-label="Cari pengguna" className="w-72" placeholder="Cari nama, email, atau NIP…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Status akun" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua status</SelectItem>
                {['Aktif', 'Terkunci', 'Wajib ganti sandi', 'Nonaktif', 'Ditangguhkan'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger aria-label="Peran" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua peran</SelectItem>
                {([...ASSIGNABLE, 'supervisor'] as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger aria-label="Department" className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua department</SelectItem>
                {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Pegawai</TableHead>
                <TableHead className={head}>Email kantor</TableHead>
                <TableHead className={head}>Peran</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={head}>OTP</TableHead>
                <TableHead className={head}>Login terakhir</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pengguna yang cocok dengan filter.</TableCell></TableRow>}
              {paging.rows.map((a) => {
                const roles = rolesOf(a, true)
                const st = statusOf(a)
                const sv = statusView(a)
                const assigned = roles.filter((r) => r !== 'supervisor')
                const isSelf = a.nip === admin.nip
                return (
                  <TableRow key={a.nip} className="h-14">
                    <TableCell><PersonCell nama={a.nama} nik={a.pegawai === false ? '—' : a.nip} /></TableCell>
                    <TableCell className="text-sm tabular-nums">{a.emailKantor}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assigned.map((r) => <StatusBadge key={r} variant="neutral">{ROLE_LABEL[r]}</StatusBadge>)}
                        {roles.includes('supervisor') && <Badge variant="outline">Atasan · otomatis</Badge>}
                        {a.pegawai !== false && st !== 'Nonaktif' && <Badge variant="outline">Karyawan · otomatis</Badge>}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge variant={sv.variant}>{sv.label}</StatusBadge></TableCell>
                    <TableCell className="text-sm">{needsOtp(roles) ? 'Wajib' : '—'}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{wib(a.loginTerakhir)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Aksi ${a.nama}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setRoleFor(a)}><UserCog /> Kelola peran</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setReset(a)} disabled={st === 'Nonaktif'}><KeyRound /> Reset kata sandi</DropdownMenuItem>
                          {st === 'Terkunci' && <DropdownMenuItem onSelect={() => { unlockAccount(a, admin); toast.success(`Kunci akun ${a.nama} dibuka`); bump() }}><LockOpen /> Buka kunci</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          {st === 'Nonaktif' ? (
                            <Tooltip>
                              <TooltipTrigger asChild><span className="block"><DropdownMenuItem disabled><ShieldCheck /> Pulihkan akses</DropdownMenuItem></span></TooltipTrigger>
                              <TooltipContent side="left">Status mengikuti offboarding di Hubungan Industrial</TooltipContent>
                            </Tooltip>
                          ) : st === 'Ditangguhkan' ? (
                            <DropdownMenuItem onSelect={() => { setSusp({ acc: a, mode: 'pulih' }); setAlasan(''); setAlasanErr('') }}><ShieldCheck /> Pulihkan akses</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled={isSelf} onSelect={() => { setSusp({ acc: a, mode: 'tangguh' }); setAlasan(''); setAlasanErr('') }}><ShieldOff /> Tangguhkan akses</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pager total={rows.length} paging={paging} />
        </CardContent>
      </Card>

      <AlertDialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset kata sandi {reset?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>Tautan reset dikirim ke {reset?.emailKantor}. Pengguna wajib mengganti kata sandi saat login berikutnya.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (reset) { toast.success(resetPasswordAdmin(reset, admin)); bump() } setReset(null) }}>Reset kata sandi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!susp} onOpenChange={(o) => !o && closeSusp()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{susp?.mode === 'tangguh' ? `Tangguhkan akses ${susp.acc.nama}?` : `Pulihkan akses ${susp?.acc.nama}?`}</AlertDialogTitle>
            <AlertDialogDescription>{susp?.mode === 'tangguh' ? 'Akun yang ditangguhkan tidak bisa login sampai dipulihkan.' : 'Akun dapat login kembali setelah dipulihkan.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="sys-alasan" label="Alasan" value={alasan} onChange={(v) => { setAlasan(v); setAlasanErr('') }} error={alasanErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant={susp?.mode === 'tangguh' ? 'destructive' : 'default'} onClick={(e) => { e.preventDefault(); doSusp() }}>{susp?.mode === 'tangguh' ? 'Tangguhkan' : 'Pulihkan'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoleSheet target={roleFor} admin={admin} onClose={() => setRoleFor(null)} onSaved={bump} />
    </div>
  )
}

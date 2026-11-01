import { ArrowLeftRight, MoreHorizontal, PiggyBank, Search, UserPlus, Users, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { ChangeSheet } from '@/components/koperasi/change-sheet'
import { MemberSheet, plafonOf } from '@/components/koperasi/member-sheet'
import { RegisterSheet } from '@/components/koperasi/register-sheet'
import { ReviewChange, ReviewRegistration } from '@/components/koperasi/review-sheets'
import { ReqBadge, rp } from '@/components/koperasi/shared'
import { WithdrawSheet } from '@/components/koperasi/withdraw-sheet'
import { CoopExitTab, activeExitMembers } from '@/components/koperasi/exit-tab'
import { useOffboarding } from '@/data/offboarding'
import { KPI_GRID, PageHeader, PersonCell, StatCard } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { stageActor } from '@/data/koperasi/ksb'
import { balanceOf, totalSimpanan } from '@/data/koperasi/ledger'
import { MEMBERS, memberOf, setoranNow, type Member } from '@/data/koperasi/members'
import { CHANGES, dipesan, MIN_PENCAIRAN, pendingChanges, pendingRegistrations, REGISTRATIONS, scheduledChange, tersedia, type ChangeReq, type Registration } from '@/data/koperasi/requests'
import { MASA_MIN } from '@/data/koperasi/settings'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'

export default function CoopMembersPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  useOffboarding()
  const isSek = user.role === 'sekretaris'
  const [tab, setTab] = useState('anggota')
  const [pill, setPill] = useState<'aktif' | 'nonaktif'>('aktif')
  const [dept, setDept] = useState(ALL)
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<string | null>(null)
  const [register, setRegister] = useState(false)
  const [change, setChange] = useState<string | null>(null)
  const [withdraw, setWithdraw] = useState<string | null>(null)
  const [reviewReg, setReviewReg] = useState<Registration | null>(null)
  const [reviewChg, setReviewChg] = useState<ChangeReq | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, dept, q, perPage])

  const aktif = MEMBERS.filter((m) => m.status === 'aktif')
  const nonaktif = MEMBERS.filter((m) => m.status === 'nonaktif')
  const departments = useMemo(() => [...new Set(MEMBERS.map((m) => m.department))].sort((a, b) => a.localeCompare(b, 'id')), [MEMBERS.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = (pill === 'aktif' ? aktif : nonaktif).filter((m) => (dept === ALL || m.department === dept) && (!q || `${m.nama} ${m.nik}`.toLowerCase().includes(q)))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = list.slice(start, start + perPage)
  const nReg = pendingRegistrations().length
  const nChg = pendingChanges().length

  const stagnant = (m: Member) => ({ wajib: setoranNow(m, 'Wajib'), sukarela: setoranNow(m, 'Sukarela') })

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Anggota & Simpanan" subtitle={`Keanggotaan koperasi karyawan dan saldo simpanan per ${formatDate(DEMO_TODAY)}`}>
        {isSek && <Button onClick={() => setRegister(true)}><UserPlus /> Daftarkan Anggota</Button>}
      </PageHeader>

      <div className={KPI_GRID}>
        <StatCard label="Anggota aktif" value={aktif.length.toLocaleString('id-ID')} icon={Users} hint={nonaktif.length ? `${nonaktif.length} anggota nonaktif` : 'Semua aktif'} />
        <StatCard label="Total simpanan" value={rp(totalSimpanan())} icon={PiggyBank} hint="Pokok + Wajib + Sukarela anggota aktif" />
        <StatCard label="Pendaftaran menunggu" value={nReg.toLocaleString('id-ID')} icon={UserPlus} hint="Menunggu persetujuan Ketua" />
        <StatCard label="Perubahan setoran menunggu" value={nChg.toLocaleString('id-ID')} icon={ArrowLeftRight} hint="Diproses Sekretaris" />
      </div>

      <Alert>
        <Info />
        <AlertDescription>Saldo per payroll September 2026. Potongan payroll Oktober 2026 akan dibukukan setelah dikonfirmasi Bendahara (Rekonsiliasi).</AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="anggota">Anggota ({aktif.length.toLocaleString('id-ID')})</TabsTrigger>
          <TabsTrigger value="pendaftaran">Pendaftaran ({nReg})</TabsTrigger>
          <TabsTrigger value="setoran">Perubahan Setoran ({nChg})</TabsTrigger>
          <TabsTrigger value="keluar">Keluar ({activeExitMembers().length})</TabsTrigger>
        </TabsList>

        <TabsContent value="keluar"><CoopExitTab user={user} /></TabsContent>

        <TabsContent value="anggota">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={pill} onValueChange={(v) => setPill(v as 'aktif' | 'nonaktif')}>
                  <TabsList>
                    <TabsTrigger value="aktif">Aktif ({aktif.length.toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="nonaktif">Nonaktif ({nonaktif.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input aria-label="Cari anggota" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
                  </div>
                  <Select value={dept} onValueChange={setDept}>
                    <SelectTrigger aria-label="Department" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Semua Department</SelectItem>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" disabled={dept === ALL && !input} onClick={() => { setDept(ALL); setInput('') }}>Reset</Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Anggota</TableHead>
                    <TableHead className={head}>Department</TableHead>
                    <TableHead className={head}>Anggota sejak</TableHead>
                    <TableHead className={head}>Setoran/bulan</TableHead>
                    <TableHead className={`text-right ${head}`}>Saldo Pokok</TableHead>
                    <TableHead className={`text-right ${head}`}>Saldo Wajib</TableHead>
                    <TableHead className={`text-right ${head}`}>Saldo Sukarela</TableHead>
                    <TableHead className={head}>Plafon pinjaman</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">Tidak ada anggota yang sesuai.</TableCell></TableRow>}
                  {pageRows.map((m) => {
                    const b = balanceOf(m.nik)
                    const dp = dipesan(m.nik)
                    const s = stagnant(m)
                    const plafon = plafonOf(m, b.Wajib)
                    const sched = (['Wajib', 'Sukarela'] as const).map((j) => scheduledChange(m.nik, j)).find(Boolean)
                    return (
                      <TableRow key={m.nik} className="h-12 hover:bg-muted/50">
                        <TableCell><PersonCell nama={m.nama} nik={m.nik} /></TableCell>
                        <TableCell>{m.department}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDate(m.sejak)}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {rp(s.wajib)} · {rp(s.sukarela)}
                          {sched && <span className="block text-xs text-muted-foreground">Berubah {formatDate(sched.berlaku)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{rp(b.Pokok)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rp(b.Wajib)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rp(b.Sukarela)}
                          {dp > 0 && <span className="block text-xs text-muted-foreground">Dipesan {rp(dp)}</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{m.status === 'nonaktif' ? '—' : plafon === null ? <StatusBadge variant="neutral">Belum {MASA_MIN} bulan</StatusBadge> : rp(plafon)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi ${m.nama}`}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setDetail(m.nik)}>Lihat Detail</DropdownMenuItem>
                              {isSek && m.status === 'aktif' && <DropdownMenuItem onSelect={() => setChange(m.nik)}>Ubah Setoran</DropdownMenuItem>}
                              {isSek && m.status === 'aktif' && <DropdownMenuItem disabled={tersedia(m.nik) < MIN_PENCAIRAN} onSelect={() => setWithdraw(m.nik)}>Ajukan Pencairan</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
          </Card>
        </TabsContent>

        <TabsContent value="pendaftaran">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Pegawai</TableHead>
                    <TableHead className={head}>Status kerja</TableHead>
                    <TableHead className={head}>Diajukan</TableHead>
                    <TableHead className={head}>Diinput oleh</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    <TableHead className={head}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REGISTRATIONS.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Belum ada pendaftaran.</TableCell></TableRow>}
                  {REGISTRATIONS.map((r) => (
                    <TableRow key={r.id} className="h-12 hover:bg-muted/50">
                      <TableCell><PersonCell nama={r.nama} nik={r.nik} /></TableCell>
                      <TableCell><StatusBadge variant="neutral">{r.statusKerja}</StatusBadge></TableCell>
                      <TableCell className="tabular-nums">{formatDate(r.diajukan)}</TableCell>
                      <TableCell>{r.diinputOleh}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <ReqBadge s={r.status} />
                          {r.keputusan?.alasan && <span className="text-xs text-muted-foreground">{r.keputusan.alasan}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.status === 'menunggu' && stageActor('ketua', r.nik).role === user.role && <Button variant="outline" size="sm" onClick={() => setReviewReg(r)}>Tinjau</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setoran">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Anggota</TableHead>
                    <TableHead className={head}>Jenis</TableHead>
                    <TableHead className={head}>Lama → Baru</TableHead>
                    <TableHead className={head}>Berlaku mulai</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    <TableHead className={head}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CHANGES.map((c) => (
                    <TableRow key={c.id} className="h-12 hover:bg-muted/50">
                      <TableCell><PersonCell nama={memberOf(c.nik)?.nama ?? c.nik} nik={c.nik} /></TableCell>
                      <TableCell>{c.jenis}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{rp(c.lama)} → <span className="font-medium">{rp(c.baru)}</span></TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(c.berlaku)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <ReqBadge s={c.status} />
                          {c.keputusan?.alasan && <span className="text-xs text-muted-foreground">{c.keputusan.alasan}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.status === 'menunggu' && stageActor('sekretaris', c.nik).role === user.role && <Button variant="outline" size="sm" onClick={() => setReviewChg(c)}>Tinjau</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MemberSheet member={detail ? (memberOf(detail) ?? null) : null} onOpenChange={(o) => !o && setDetail(null)} />
      <RegisterSheet open={register} onOpenChange={setRegister} actor={user.nama} />
      <ChangeSheet member={change ? (memberOf(change) ?? null) : null} onOpenChange={(o) => !o && setChange(null)} actor={user.nama} />
      <WithdrawSheet key={withdraw ?? 'none'} open={withdraw !== null} onOpenChange={(o) => !o && setWithdraw(null)} actor={user.nama} initialNik={withdraw ?? undefined} />
      <ReviewRegistration reg={reviewReg} onClose={() => setReviewReg(null)} actor={user.nama} />
      <ReviewChange req={reviewChg} onClose={() => setReviewChg(null)} actor={user.nama} />
    </div>
  )
}

import { Download } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Pager, usePaging } from '@/components/attendance/pager'
import { DatePicker } from '@/components/employee/date-picker'
import { download } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { accountOf } from '@/data/accounts'
import { auditVersion, EVENT_LABEL, securityAuditLog, subscribeAudit, type AuditEvent, type SecurityAuditEntry } from '@/data/audit-log'
import { ROLE_LABEL, type Role } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`
const waktu = (at: string) => `${formatDate(at.slice(0, 10))}, ${at.slice(11, 16).replace(':', '.')} WIB`
const who = (e: SecurityAuditEntry) => e.pengguna ?? accountOf(e.nip ?? '')?.nama ?? e.email

/** Audit log keamanan: append-only, tanpa aksi hapus/edit. */
export function AuditTab() {
  useSyncExternalStore(subscribeAudit, auditVersion)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [user, setUser] = useState(ALL)
  const [event, setEvent] = useState(ALL)
  const [hasil, setHasil] = useState(ALL)
  const all = [...securityAuditLog()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.id - a.id))
  const users = useMemo(() => [...new Set(all.map(who))].sort(), [all.length])
  const rows = all.filter((e) => (!dari || e.at.slice(0, 10) >= dari) && (!sampai || e.at.slice(0, 10) <= sampai) && (user === ALL || who(e) === user) && (event === ALL || e.event === event) && (hasil === ALL || e.hasil === hasil))
  const paging = usePaging(rows, `${dari}|${sampai}|${user}|${event}|${hasil}|${all.length}`, 25)
  const peranOf = (e: SecurityAuditEntry) => (e.peran ? ROLE_LABEL[e.peran as Role] ?? e.peran : '—')
  const csv = () => {
    const lines = [['Waktu (WIB)', 'Pengguna', 'Email', 'Peran aktif', 'Event', 'Detail', 'Hasil'].join(',')]
    for (const e of rows) lines.push([waktu(e.at), who(e), e.email, peranOf(e), EVENT_LABEL[e.event], e.detail, e.hasil].map(csvCell).join(','))
    download('audit-log-keamanan.csv', lines.join('\r\n') + '\r\n')
    toast.success(`Audit log diunduh (${rows.length} baris)`)
  }
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><label htmlFor="au-dari" className="text-xs text-muted-foreground">Dari tanggal</label><div className="w-44"><DatePicker id="au-dari" value={dari} onChange={setDari} placeholder="Semua" /></div></div>
          <div className="space-y-1"><label htmlFor="au-sampai" className="text-xs text-muted-foreground">Sampai tanggal</label><div className="w-44"><DatePicker id="au-sampai" value={sampai} onChange={setSampai} placeholder="Semua" /></div></div>
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger aria-label="Pengguna" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua pengguna</SelectItem>{users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger aria-label="Jenis event" className="w-60"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua event</SelectItem>{(Object.keys(EVENT_LABEL) as AuditEvent[]).map((k) => <SelectItem key={k} value={k}>{EVENT_LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={hasil} onValueChange={setHasil}>
            <SelectTrigger aria-label="Hasil" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua hasil</SelectItem><SelectItem value="Berhasil">Berhasil</SelectItem><SelectItem value="Gagal">Gagal</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" className="ml-auto" onClick={csv} disabled={rows.length === 0}><Download /> Unduh CSV</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Waktu (WIB)</TableHead><TableHead className={head}>Pengguna</TableHead><TableHead className={head}>Peran aktif</TableHead>
              <TableHead className={head}>Event</TableHead><TableHead className={head}>Detail</TableHead><TableHead className={head}>Hasil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Tidak ada event pada filter ini.</TableCell></TableRow>}
            {paging.rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{waktu(e.at)}</TableCell>
                <TableCell className="text-sm font-medium">{who(e)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{peranOf(e)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{EVENT_LABEL[e.event]}</TableCell>
                <TableCell className="max-w-lg whitespace-normal text-sm text-muted-foreground">{e.detail}</TableCell>
                <TableCell><StatusBadge variant={e.hasil === 'Berhasil' ? 'success' : 'danger'}>{e.hasil}</StatusBadge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pager total={rows.length} paging={paging} />
      </CardContent>
    </Card>
  )
}

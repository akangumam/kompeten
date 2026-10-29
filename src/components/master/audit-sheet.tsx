import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AUDIT, AUDIT_GROUPS, atLabel, type AuditGroup } from '@/data/master/audit-log'
import { formatDate } from '@/lib/format'

export function AuditSheet({ open, onOpenChange, query, onQuery }: { open: boolean; onOpenChange: (o: boolean) => void; query: string; onQuery: (q: string) => void }) {
  const [group, setGroup] = useState<'all' | AuditGroup>('all')
  const rows = useMemo(
    () =>
      AUDIT.filter((a) => (group === 'all' || a.group === group) && `${a.entitas} ${a.perubahan}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) =>
        b.at.localeCompare(a.at),
      ),
    [group, query, open, AUDIT.length],
  )
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Riwayat Perubahan</SheetTitle>
          <SheetDescription>Perubahan data master, terbaru di atas.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select value={group} onValueChange={(v) => setGroup(v as 'all' | AuditGroup)}>
              <SelectTrigger className="w-full" aria-label="Filter entitas"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua entitas</SelectItem>
                {AUDIT_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input aria-label="Cari riwayat" placeholder="Cari entitas atau perubahan" value={query} onChange={(e) => onQuery(e.target.value)} />
          </div>
          <ol className="space-y-3">
            {rows.map((a) => (
              <li key={a.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{a.entitas}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{atLabel(a.at)}</span>
                </div>
                <p className="mt-1 tabular-nums">{a.perubahan}</p>
                <p className="mt-1 text-xs text-muted-foreground">Oleh {a.by} · Berlaku mulai {formatDate(a.berlaku)}</p>
              </li>
            ))}
            {rows.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Belum ada perubahan yang cocok.</li>}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  )
}

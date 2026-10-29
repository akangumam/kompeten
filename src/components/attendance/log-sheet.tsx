import { ArrowRight } from 'lucide-react'
import { DayStatus } from '@/components/attendance/day-status'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { describe, empByNik, pairScans, SHIFTS, toDot, toMin, type DayRecord, type Scan } from '@/data/attendance'
import { formatDate } from '@/lib/format'

export function recordTitle(r: DayRecord) {
  const emp = empByNik(r.nik)
  return emp ? emp.nama : `PIN ${r.pin}`
}

export function ScanLog({ rec, scans }: { rec: DayRecord; scans: Scan[] }) {
  const p = pairScans(scans, rec.pin!, rec.date, rec.shift)
  const items = [
    ...p.kept.map((s) => ({ s, kind: 'kept' as const })),
    ...p.ignored.map((s) => ({ s, kind: 'dup' as const })),
  ].sort((a, b) => (a.s.date + a.s.time).localeCompare(b.s.date + b.s.time))
  if (!items.length)
    return <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Tidak ada scan dari mesin pada hari ini.</p>
  return (
    <ul className="divide-y rounded-md border">
      {items.map(({ s, kind }) => {
        const dot = toDot(toMin(s.time))
        const next = s.date !== rec.date
        const label =
          kind === 'dup' ? 'Ganda · diabaikan' : p.masuk === dot && !next ? 'Masuk' : p.pulang === dot ? 'Pulang' : 'Scan tunggal'
        return (
          <li key={s.date + s.time} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="tabular-nums">
              {dot}
              {next && <span className="text-muted-foreground"> (+1 · {formatDate(s.date)})</span>}
            </span>
            <StatusBadge variant={kind === 'dup' ? 'neutral' : 'info'}>{label}</StatusBadge>
          </li>
        )
      })}
    </ul>
  )
}

export function LogSheet({ rec, scans, onClose }: { rec: DayRecord | null; scans: Scan[]; onClose: () => void }) {
  const d = rec ? describe(rec) : null
  return (
    <Sheet open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {rec && d && (
          <>
            <SheetHeader>
              <SheetTitle>Log Scan · {recordTitle(rec)}</SheetTitle>
              <SheetDescription className="tabular-nums">
                {formatDate(rec.date)}
                {rec.shift && ` · Shift ${SHIFTS[rec.shift].label} ${SHIFTS[rec.shift].range}`}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Status</h3>
                <DayStatus badges={d.badges} />
                {d.keterangan && <p className="text-sm text-muted-foreground">{d.keterangan}</p>}
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Scan mesin</h3>
                <ScanLog rec={rec} scans={scans} />
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Riwayat perubahan</h3>
                {rec.audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada perubahan manual.</p>
                ) : (
                  <ol className="space-y-3">
                    {rec.audit.map((a, i) => (
                      <li key={i} className="space-y-1 rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{a.action}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{a.at}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">oleh {a.by}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span>{a.before}</span>
                          <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                          <span className="font-medium">{a.after}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

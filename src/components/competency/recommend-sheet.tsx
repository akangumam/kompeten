import { toast } from 'sonner'
import { PersonCell } from '@/components/payroll/pay/shared'
import { TypeBadge } from '@/components/training/shared'
import { SHEET_720 } from '@/components/training/detail-sheet'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { scoreOfRow, statusOf, type CompRow } from '@/data/competency/assessments'
import { addParticipants, enrollmentOf, PROGRAMS, proposeParticipants, useTraining } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'

/** Rekomendasi training untuk satu kompetensi: program aktif terkait dan pegawai yang bergap. */
export function RecommendSheet({ target, rows, periodId, user, onClose }: { target: { kode: string; nama: string } | null; rows: CompRow[]; periodId: string; user: CurrentUser; onClose: () => void }) {
  useTraining()
  const gapped = target
    ? rows.filter((r) => ['diajukan', 'final'].includes(statusOf(r))).flatMap((r) => {
        const it = scoreOfRow(r, periodId).items.find((i) => i.kode === target.kode)
        return it?.gap != null && it.gap >= 1 ? [{ r, gap: it.gap }] : []
      })
    : []
  const programs = target ? PROGRAMS.filter((p) => p.status === 'Aktif' && p.kompetensi.some((k) => k.kode === target.kode)) : []
  const admin = user.role === 'admin'
  const spv = user.role === 'supervisor'
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_720}>
        <SheetHeader className="border-b">
          <SheetTitle>Rekomendasi training</SheetTitle>
          <SheetDescription>{target?.nama} <span className="tabular-nums">({target?.kode})</span> · {gapped.length} pegawai dengan gap</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 p-4">
          {programs.length === 0 && <p className="rounded-md border p-4 text-sm text-muted-foreground">Belum ada program aktif untuk kompetensi ini. Admin HRD dapat membuatnya di People Development › Training.</p>}
          {programs.map((p) => {
            const belum = gapped.filter((g) => !enrollmentOf(p.kode, g.r.emp.nik))
            return (
              <section key={p.kode} className="space-y-2" aria-label={p.judul}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.judul}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground"><span className="tabular-nums">{p.kode}</span><TypeBadge tipe={p.tipe} /></p>
                  </div>
                  {(admin || spv) && (
                    <Button
                      size="sm"
                      disabled={belum.length === 0}
                      onClick={() => {
                        const niks = belum.map((g) => g.r.emp.nik)
                        if (admin) { const n = addParticipants(p.kode, niks); toast.success(`${n} pegawai didaftarkan ke ${p.kode}`) }
                        else { const n = proposeParticipants(p.kode, niks, user); toast.success(`${n} usulan dikirim ke Admin HRD`) }
                      }}
                    >
                      {admin ? `Daftarkan ke ${p.kode}` : `Usulkan ke ${p.kode}`}
                    </Button>
                  )}
                </div>
                <ul className="divide-y rounded-md border">
                  {gapped.map(({ r, gap }) => {
                    const sudah = !!enrollmentOf(p.kode, r.emp.nik)
                    return (
                      <li key={r.emp.nik} className="flex items-center justify-between gap-3 p-3">
                        <PersonCell nama={r.emp.nama} nik={r.emp.nik} />
                        <span className="flex items-center gap-2 text-sm"><span className="tabular-nums text-muted-foreground">Gap {gap}</span>{sudah ? <StatusBadge variant="success">Sudah terdaftar</StatusBadge> : <StatusBadge variant="neutral">Belum</StatusBadge>}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

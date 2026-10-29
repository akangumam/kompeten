import { ChevronLeft, FilePlus2, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { avg, initials, type Candidate } from '@/data/candidates'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Kandidat berstatus Diterima yang belum punya draft pegawai. */
  candidates: Candidate[]
  onPickCandidate: (c: Candidate) => void
  onDirect: () => void
}

const card =
  'flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-card'

function Option({
  icon: Icon,
  title,
  desc,
  badge,
  disabled,
  onClick,
}: {
  icon: typeof UserCheck
  title: string
  desc: string
  badge?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={card} disabled={disabled} onClick={onClick}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1 space-y-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
      {badge && <StatusBadge variant="neutral">{badge}</StatusBadge>}
    </button>
  )
}

export function AddEmployeeDialog({ open, onOpenChange, candidates, onPickCandidate, onDirect }: Props) {
  const [step, setStep] = useState<'choose' | 'candidate'>('choose')
  useEffect(() => {
    if (open) setStep('choose')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Pegawai</DialogTitle>
          <DialogDescription>
            {step === 'choose' ? 'Pilih asal data pegawai baru.' : 'Pilih kandidat yang sudah diterima. Data lamaran disalin ke Draft Pegawai.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="space-y-3">
            <Option
              icon={UserCheck}
              title="Dari kandidat diterima"
              desc={
                candidates.length > 0
                  ? 'Gunakan data lamaran yang sudah ada, tanpa ketik ulang.'
                  : 'Belum ada kandidat diterima yang belum dibuatkan draft.'
              }
              badge={`${candidates.length} kandidat`}
              disabled={candidates.length === 0}
              onClick={() => setStep('candidate')}
            />
            <Option
              icon={FilePlus2}
              title="Input langsung (tanpa rekrutmen)"
              desc="Untuk outsourcing, magang, atau pegawai pindahan. Data Personal diisi sendiri dan wajib lengkap."
              onClick={onDirect}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y rounded-lg border">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(c.nama)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium">{c.nama}</p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {c.posisi} · {c.id}
                      {avg(c) != null && ` · Nilai ${avg(c)}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onPickCandidate(c)}>
                    Pilih
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>
              <ChevronLeft /> Kembali
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

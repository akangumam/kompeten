import type { ComponentProps, ElementType } from 'react'
import { cn } from '@/lib/utils'

export const DRAFT_LINE = 'DRAFT — belum disetujui, tidak berlaku sebagai dokumen resmi'

type Props = Omit<ComponentProps<'div'>, 'className'> & {
  /** Elemen pembungkus kertas (default div; slip memakai article). */
  as?: ElementType
  /** Belum disetujui: watermark diagonal + baris penanda di kepala dokumen. */
  draft?: boolean
  /** Kelas untuk kertas (padding, lebar). */
  paperClassName?: string
  /** Kelas untuk isi (spasi antar blok, perataan). */
  className?: string
}

/**
 * Kertas dokumen resmi (SK, PKWT, slip, sertifikat, surat). Selalu terang di mode apa pun:
 * `.paper-light` mendeklarasikan ulang token terang, sehingga semua anak memakai warna cetak.
 * Hanya kertas yang dicetak (lihat @media print di index.css).
 */
export function DocumentPaper({ as: Tag = 'div', draft = false, paperClassName, className, children, ...rest }: Props) {
  return (
    <Tag className={cn('paper-light paper-sheet relative overflow-hidden rounded-md border bg-card p-8 text-sm text-card-foreground', paperClassName)} {...rest}>
      {draft && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <span className="-rotate-[30deg] select-none text-8xl font-bold tracking-widest text-muted-foreground/70">DRAFT</span>
        </div>
      )}
      <div className={cn('relative z-10', className)}>
        {draft && <p className="mb-4 text-sm font-semibold text-danger">{DRAFT_LINE}</p>}
        {children}
      </div>
    </Tag>
  )
}

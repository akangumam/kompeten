import { cn } from '@/lib/utils'

// Logo resmi KOMPETEN (dikonfirmasi klien): versi berwarna untuk mode terang, versi putih untuk mode gelap.
// Logo penuh sudah memuat tagline "HRIS & Koperasi" di dalam gambar; tidak ada teks tambahan di sekitarnya.
const FULL = { light: '/assets/logo-full.svg', dark: '/assets/logo-full-white.svg' }
const MARK = { light: '/assets/logo-mark.svg', dark: '/assets/logo-mark-white.svg' }

// Mode gelap menukar ke versi putih; saat dicetak (kertas putih) tetap memakai versi berwarna.
const lightCls = 'dark:hidden dark:print:block'
const darkCls = 'hidden dark:block dark:print:hidden'

export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  const src = markOnly ? MARK : FULL
  const alt = markOnly ? 'KOMPETEN' : 'KOMPETEN HRIS & Koperasi'
  const size = markOnly ? 'size-8 object-contain' : 'h-11 w-auto'
  return (
    <span className={cn('inline-flex shrink-0', className)}>
      <img src={src.light} alt={alt} className={cn(size, 'shrink-0', lightCls)} />
      <img src={src.dark} alt="" aria-hidden className={cn(size, 'shrink-0', darkCls)} />
    </span>
  )
}

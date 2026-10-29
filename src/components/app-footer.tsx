import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { APP_VERSION } from '@/lib/app'

const soon = () => toast.info('Dibuat di tahap berikutnya')
const dot = (
  <span aria-hidden className="text-muted-foreground">
    ·
  </span>
)
const link = 'h-auto p-0 text-xs text-muted-foreground hover:text-foreground'

/** Footer tetap di dasar viewport (di luar area scroll `main`); halaman tidak boleh membuat footer sendiri. */
export function AppFooter() {
  return (
    <footer className="hidden shrink-0 items-center justify-between gap-4 border-t bg-background px-4 py-3 text-xs text-muted-foreground md:flex lg:px-6 print:hidden">
      <p>© 2026 PT Primaplast Indonesia · KOMPETEN HRIS &amp; Koperasi</p>
      <div className="flex items-center gap-x-2">
        <span>Versi {APP_VERSION}</span>
        {dot}
        <span>Semua waktu dalam WIB</span>
        {dot}
        <Button variant="link" className={link} onClick={soon}>
          Bantuan
        </Button>
        {dot}
        <Button variant="link" className={link} onClick={soon}>
          Kebijakan Privasi
        </Button>
      </div>
    </footer>
  )
}

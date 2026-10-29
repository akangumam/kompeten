import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CardFooter } from '@/components/ui/card'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function pageList(current: number, total: number): (number | 'gap-l' | 'gap-r')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | 'gap-l' | 'gap-r')[] = [1]
  if (current > 3) out.push('gap-l')
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) out.push(n)
  if (current < total - 2) out.push('gap-r')
  out.push(total)
  return out
}

type Props = {
  total: number
  start: number
  perPage: number
  current: number
  totalPages: number
  onPerPage: (n: number) => void
  onPage: (n: number) => void
  /** Satuan baris, mis. "anggota" (default "data"); bila diisi rentang ditulis "1–20". */
  unit?: string
  sizes?: number[]
}

export function DirectoryFooter({ total, start, perPage, current, totalPages, onPerPage, onPage, unit, sizes = [10, 25, 50] }: Props) {
  const nav = (label: string, disabled: boolean, to: number, icon: React.ReactNode) => (
    <PaginationItem>
      <PaginationLink
        href="#"
        aria-label={label}
        aria-disabled={disabled}
        className={disabled ? 'pointer-events-none opacity-50' : undefined}
        onClick={(e) => {
          e.preventDefault()
          onPage(to)
        }}
      >
        {icon}
      </PaginationLink>
    </PaginationItem>
  )
  return (
    <CardFooter className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        Menampilkan {total === 0 ? 0 : start + 1}{unit ? '–' : ' - '}{Math.min(start + perPage, total)} dari {total.toLocaleString('id-ID')} {unit ?? 'data'}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Baris per halaman</span>
          <Select value={String(perPage)} onValueChange={(v) => onPerPage(Number(v))}>
            <SelectTrigger aria-label="Baris per halaman" className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sizes.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            {nav('Halaman sebelumnya', current === 1, current - 1, <ChevronLeft className="size-4" />)}
            {pageList(current, totalPages).map((n) =>
              typeof n === 'number' ? (
                <PaginationItem key={n}>
                  <PaginationLink href="#" isActive={n === current} onClick={(e) => { e.preventDefault(); onPage(n) }}>{n}</PaginationLink>
                </PaginationItem>
              ) : (
                <PaginationItem key={n}><PaginationEllipsis /></PaginationItem>
              ),
            )}
            {nav('Halaman berikutnya', current === totalPages, current + 1, <ChevronRight className="size-4" />)}
          </PaginationContent>
        </Pagination>
      </div>
    </CardFooter>
  )
}

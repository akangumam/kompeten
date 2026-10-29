import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CardFooter } from '@/components/ui/card'
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Footer tabel halaman penuh: "Menampilkan a - b dari n data", baris per halaman 5/10/25/50, dan Pagination. */
export function PagedFooter({ total, page, perPage, setPage, setPerPage }: { total: number; page: number; perPage: number; setPage: (n: number) => void; setPerPage: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, pages)
  const start = (current - 1) * perPage
  return (
    <CardFooter className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground tabular-nums">Menampilkan {total === 0 ? 0 : start + 1} - {Math.min(start + perPage, total)} dari {total} data</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Baris per halaman</span>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
            <SelectTrigger aria-label="Baris per halaman" className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[5, 10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#" aria-label="Halaman sebelumnya" aria-disabled={current === 1} className={current === 1 ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); setPage(current - 1) }}><ChevronLeft className="size-4" /></PaginationLink>
            </PaginationItem>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <PaginationItem key={n}><PaginationLink href="#" isActive={n === current} onClick={(e) => { e.preventDefault(); setPage(n) }}>{n}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink href="#" aria-label="Halaman berikutnya" aria-disabled={current === pages} className={current === pages ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); setPage(current + 1) }}><ChevronRight className="size-4" /></PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </CardFooter>
  )
}
export const pageSlice = <T,>(list: T[], page: number, perPage: number) => {
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const current = Math.min(page, pages)
  return list.slice((current - 1) * perPage, current * perPage)
}

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function usePaging<T>(items: T[], resetKey: string, initial = 10) {
  const [perPage, setPerPage] = useState(initial)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [resetKey, perPage])
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  return { rows: items.slice(start, start + perPage), perPage, setPerPage, setPage, totalPages, current, start }
}

type Paging = Pick<ReturnType<typeof usePaging>, 'perPage' | 'setPerPage' | 'setPage' | 'totalPages' | 'current' | 'start'>

export function Pager({ total, paging }: { total: number; paging: Paging }) {
  const { perPage, setPerPage, setPage, totalPages, current, start } = paging
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        Menampilkan {total === 0 ? 0 : start + 1} - {Math.min(start + perPage, total)} dari {total} data
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Baris per halaman</span>
          <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
            <SelectTrigger aria-label="Baris per halaman" className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Halaman sebelumnya"
                aria-disabled={current === 1}
                className={current === 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => { e.preventDefault(); setPage(current - 1) }}
              >
                <ChevronLeft className="size-4" />
              </PaginationLink>
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <PaginationItem key={n}>
                <PaginationLink href="#" isActive={n === current} onClick={(e) => { e.preventDefault(); setPage(n) }}>
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Halaman berikutnya"
                aria-disabled={current === totalPages}
                className={current === totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => { e.preventDefault(); setPage(current + 1) }}
              >
                <ChevronRight className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

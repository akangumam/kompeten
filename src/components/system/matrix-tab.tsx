import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MATRIX, MATRIX_COLS } from '@/lib/access'

const LEGEND: [string, string][] = [['P', 'Penuh'], ['S', 'Setujui'], ['B', 'Baca saja'], ['T', 'Hanya tim sendiri'], ['*', 'Catatan khusus'], ['—', 'Tidak ada akses']]
const VARIANT = (code: string) => (code.startsWith('P') ? 'success' : code.startsWith('S') ? 'info' : code.startsWith('T') ? 'warning' : 'neutral') as 'success' | 'info' | 'warning' | 'neutral'
const head = 'text-xs font-medium text-muted-foreground'

/** Matriks menu × peran, dirender langsung dari MATRIX di src/lib/access.ts (baca saja). */
export function MatrixTab() {
  return (
    <div className="space-y-4">
      <Alert variant="info"><Info aria-hidden /><AlertDescription>Matriks hak akses ditetapkan lewat rilis aplikasi dan tidak dapat diubah di sini.</AlertDescription></Alert>
      <Card>
        <CardHeader>
          <CardTitle>Matriks akses menu (web)</CardTitle>
          <CardDescription>Sumber: docs/peran-dan-akses.md v2.2. Arahkan kursor ke kode yang bertanda titik untuk melihat catatan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda">
            {LEGEND.map(([k, v]) => <li key={k} className="flex items-center gap-1.5"><StatusBadge variant={k === '—' ? 'neutral' : VARIANT(k)}>{k}</StatusBadge>{v}</li>)}
          </ul>
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 min-w-64 border-r bg-card ${head}`}>Menu</TableHead>
                {MATRIX_COLS.map((c) => <TableHead key={c} className={`text-center ${head}`}>{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIX.map((row) => (
                <TableRow key={row.menu} className="group">
                  <TableCell className="sticky left-0 z-10 min-w-64 whitespace-normal border-r bg-card text-sm font-medium group-hover:bg-muted">{row.menu}</TableCell>
                  {row.cells.map(([code, note], i) => (
                    <TableCell key={MATRIX_COLS[i]} className="text-center">
                      {code === '—' ? (
                        <span className="text-muted-foreground" aria-label="Tidak ada akses">—</span>
                      ) : note ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label={`${MATRIX_COLS[i]}: ${code}, ${note}`}>
                              <StatusBadge variant={VARIANT(code)}>{code}<span aria-hidden className="ml-1 size-1.5 rounded-full bg-current" /></StatusBadge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-72">{note}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <StatusBadge variant={VARIANT(code)}>{code}</StatusBadge>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

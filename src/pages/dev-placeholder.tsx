import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/payroll/pay/shared'
import { Skeleton } from '@/components/ui/skeleton'

/** Halaman People Development yang dibangun di tahap berikutnya. */
export default function DevPlaceholderPage({ title, subtitle, stage }: { title: string; subtitle: string; stage: string }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <p className="text-sm text-muted-foreground">Halaman ini dibuat di tahap berikutnya ({stage}).</p>
        </CardContent>
      </Card>
    </div>
  )
}

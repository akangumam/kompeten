import { History } from 'lucide-react'
import { useState } from 'react'
import { ComponentsTab } from '@/components/payroll/components-tab'
import { PayrollHistorySheet } from '@/components/payroll/history-sheet'
import { BpjsMembershipTab } from '@/components/payroll/bpjs-membership-tab'
import { ReconPanel } from '@/components/payroll/recon-tab'
import { SalaryTab } from '@/components/payroll/salary-tab'
import { StatutoryTab } from '@/components/payroll/statutory-tab'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PAYROLL_PERIOD } from '@/data/payroll/period'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import type { PageId } from '@/App'
import type { RunCtx } from '@/data/payroll/runs'

type Props = { user: CurrentUser; ctx: RunCtx; onNavigate: (page: PageId) => void }

export default function PayrollComponentsPage({ user, ctx, onNavigate }: Props) {
  const [tab, setTab] = useState('komponen')
  const [hist, setHist] = useState(false)
  const [query, setQuery] = useState('')
  const canEdit = user.role === 'payroll'
  const openHistory = (q: string) => {
    setQuery(q)
    setHist(true)
  }
  const p = PAYROLL_PERIOD

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-[480px] space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Komponen Gaji</h1>
          <p className="text-sm text-muted-foreground">Komponen pendapatan dan potongan, gaji per pegawai, serta parameter BPJS &amp; PPh 21</p>
          <p className="text-sm text-muted-foreground">
            Periode gaji {p.label}: kehadiran, lembur, dan potongan dari cut-off {formatDate(p.cutoffDari)} – {formatDate(p.cutoffSampai)}; kasbon bulan November
            (jendela 1–23 Nov); dibayar <span className="font-medium text-foreground">{formatDate(p.bayar)} (akhir bulan)</span>.
          </p>
        </div>
        <Button variant="outline" onClick={() => openHistory('')}>
          <History /> Riwayat Perubahan
        </Button>
      </div>

      {!canEdit && (
        <Alert variant="info">
          <AlertDescription>Mode baca. Perubahan dilakukan oleh Payroll Officer.</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="komponen">Komponen</TabsTrigger>
          <TabsTrigger value="gaji">Gaji Pegawai</TabsTrigger>
          <TabsTrigger value="bpjs">BPJS &amp; PPh 21</TabsTrigger>
          <TabsTrigger value="kepesertaan">Kepesertaan BPJS</TabsTrigger>
          <TabsTrigger value="rekon">Rekonsiliasi Potongan</TabsTrigger>
        </TabsList>
        <TabsContent value="komponen">
          <ComponentsTab user={user} canEdit={canEdit} onHistory={openHistory} onGoto={(t) => setTab(t)} onGotoPage={() => onNavigate('salary-change')} />
        </TabsContent>
        <TabsContent value="gaji">
          <SalaryTab canEdit={canEdit} actor={user.nama} onHistory={openHistory} onGotoChange={() => onNavigate('salary-change')} />
        </TabsContent>
        <TabsContent value="bpjs">
          <StatutoryTab user={user} canEdit={canEdit} canOpenMaster={user.role === 'manager'} onGotoPage={onNavigate} />
        </TabsContent>
        <TabsContent value="kepesertaan">
          <BpjsMembershipTab canEdit={canEdit} actor={user.nama} />
        </TabsContent>
        <TabsContent value="rekon">
          <ReconPanel user={user} ctx={ctx} onNavigate={onNavigate} />
        </TabsContent>
      </Tabs>

      <PayrollHistorySheet open={hist} onOpenChange={setHist} query={query} onQuery={setQuery} />
    </div>
  )
}

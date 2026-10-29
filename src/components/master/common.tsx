import { History, MoreHorizontal, Pencil, Power, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { DirPreset } from '@/data/directory'
import { useDirectoryNav } from '@/lib/directory-nav'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { formatDate } from '@/lib/format'

export type TabProps = { canEdit: boolean; onHistory: (query: string) => void }


export function MasterCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}

export const AktifBadge = ({ status }: { status: 'Aktif' | 'Nonaktif' }) => (
  <StatusBadge variant={status === 'Aktif' ? 'success' : 'neutral'}>{status}</StatusBadge>
)

export function UsedBy({ n, unit = 'pegawai', preset }: { n: number; unit?: string; preset: DirPreset }) {
  const { openDirectory } = useDirectoryNav()
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto p-0 tabular-nums"
      onClick={() => openDirectory(preset)}
      aria-label={`${n} ${unit}, buka Direktori Pegawai`}
    >
      {n.toLocaleString('id-ID')} {unit}
    </Button>
  )
}

export function RowMenu({
  canEdit,
  status,
  used,
  onEdit,
  onToggle,
  onDelete,
  onHistory,
  deletable = true,
}: {
  canEdit: boolean
  status?: 'Aktif' | 'Nonaktif'
  used: number
  onEdit?: () => void
  onToggle?: () => void
  onDelete?: () => void
  onHistory: () => void
  deletable?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Aksi">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
        )}
        {canEdit && onToggle && status && (
          <DropdownMenuItem onSelect={onToggle}>
            <Power /> {status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
          </DropdownMenuItem>
        )}
        {canEdit && onDelete && deletable && used === 0 && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Hapus
          </DropdownMenuItem>
        )}
        {canEdit && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onHistory}>
          <History /> Lihat riwayat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function BerlakuField({
  id,
  value,
  onChange,
  error,
  className,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  error?: string
  className?: string
}) {
  return (
    <Field
      id={id}
      label="Berlaku mulai"
      required
      error={error}
      helper={`Default: awal periode absensi berikutnya (${formatDate(nextPeriodStart())}). Periode sebelumnya tetap memakai nilai lama.`}
      className={className}
    >
      <DatePicker id={id} value={value} onChange={onChange} invalid={!!error} aria-describedby={error ? `${id}-err` : `${id}-help`} />
    </Field>
  )
}

export const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export function EditSheet({
  title,
  description,
  onClose,
  onSave,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  onSave: () => void
  children: ReactNode
}) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">{children}</div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={onSave}>Simpan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export const descId = (id: string, helper?: boolean, error?: boolean, warning?: boolean) =>
  [helper && !error ? `${id}-help` : null, warning ? `${id}-warn` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') ||
  undefined

type Props = {
  id: string
  label: string
  required?: boolean
  error?: string
  helper?: string
  warning?: string
  className?: string
  children: ReactNode
}

export function Field({ id, label, required, error, helper, warning, className, children }: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-danger"> *</span>}
        {required && <span className="sr-only"> (wajib)</span>}
      </Label>
      {children}
      {helper && !error && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
      {warning && (
        <p id={`${id}-warn`} className="flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {warning}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

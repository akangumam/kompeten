import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        success: 'border-success/20 bg-success/10 text-success dark:bg-success/15',
        info: 'border-info/20 bg-info/10 text-info dark:bg-info/15',
        warning: 'border-warning/20 bg-warning/10 text-warning dark:bg-warning/15',
        danger: 'border-danger/20 bg-danger/10 text-danger dark:bg-danger/15',
        neutral: 'border-border bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type StatusBadgeProps = React.ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>

export function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return <span data-slot="status-badge" className={cn(statusBadgeVariants({ variant }), className)} {...props} />
}

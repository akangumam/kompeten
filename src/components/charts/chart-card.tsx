import type { ReactNode } from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Props = {
  title: string
  description?: string
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, description, action, footer, children, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="flex-col items-start gap-2 text-sm">{footer}</CardFooter>
      )}
    </Card>
  )
}

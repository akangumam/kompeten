import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      onClick={toggle}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  )
}

import { useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const formatSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024)).toLocaleString('id-ID')} KB`)

export type PickedFile = { name: string; size: number }

export function FilePicker({
  id,
  accept,
  extensions,
  maxBytes,
  typeError,
  value,
  onChange,
  describedBy,
}: {
  id: string
  accept: string
  extensions: string[]
  maxBytes: number
  typeError: string
  value: PickedFile | null
  onChange: (f: PickedFile | null) => void
  describedBy?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const pick = (f?: File) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!extensions.includes(ext)) return setError(typeError)
    if (f.size > maxBytes) return setError(`Ukuran file maksimal ${formatSize(maxBytes)}`)
    setError('')
    onChange({ name: f.name, size: f.size })
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button type="button" variant="outline" aria-describedby={describedBy} onClick={() => input.current?.click()}>
          <Paperclip className="size-4" />
          Pilih file
        </Button>
        {value ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm" title={value.name}>
              {value.name} <span className="text-muted-foreground tabular-nums">· {formatSize(value.size)}</span>
            </span>
            <Button type="button" variant="ghost" size="icon" aria-label="Hapus lampiran" onClick={() => { onChange(null); setError('') }}>
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Belum ada file</span>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  )
}

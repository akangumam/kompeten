/** Nilai berlaku per tanggal (effective-dated): entri terakhir dengan berlakuMulai ≤ tanggal. */
export type Dated<T> = { berlakuMulai: string; value: T; oleh?: string; alasan?: string }

export function datedAt<T>(list: Dated<T>[], date: string): Dated<T> {
  const sorted = [...list].sort((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai))
  return [...sorted].reverse().find((x) => x.berlakuMulai <= date) ?? sorted[0]
}

/** Tambah/ganti entri dengan tanggal berlaku yang sama, lalu urutkan. */
export function datedPush<T>(list: Dated<T>[], entry: Dated<T>) {
  const i = list.findIndex((x) => x.berlakuMulai === entry.berlakuMulai)
  if (i >= 0) list[i] = entry
  else list.push(entry)
  list.sort((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai))
}

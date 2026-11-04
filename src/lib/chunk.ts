/** Splits a list into pieces of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  const pieces: T[][] = []
  for (let i = 0; i < items.length; i += size) pieces.push(items.slice(i, i + size))
  return pieces
}
